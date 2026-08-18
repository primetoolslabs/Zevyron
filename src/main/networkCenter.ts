import { ipcMain } from "electron"
import si from "systeminformation"
import { executePowerShell } from "@main/powershell"

type ProbeResult = {
  host: string
  latencyMs: number | null
  packetLoss: number | null
  reachable: boolean
}

function numberOrNull(value: unknown): number | null {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}

async function probeHost(host: string): Promise<ProbeResult> {
  let latencyMs: number | null = null
  try {
    const latency = await si.inetLatency(host)
    latencyMs = numberOrNull(latency)
  } catch {
    latencyMs = null
  }

  let packetLoss: number | null = null
  try {
    const script = `
$ErrorActionPreference = 'SilentlyContinue'
$target = ${JSON.stringify(host)}
$replies = @(Test-Connection -ComputerName $target -Count 4 -ErrorAction SilentlyContinue)
$received = [int]$replies.Count
$loss = [math]::Round((1 - ($received / 4.0)) * 100, 1)
[PSCustomObject]@{ received=$received; loss=$loss } | ConvertTo-Json -Compress
`
    const response = await executePowerShell(null, { script, name: "network-center-probe" })
    if (response?.success && String(response.output || "").trim()) {
      const parsed = JSON.parse(String(response.output).trim())
      packetLoss = numberOrNull(parsed?.loss)
    }
  } catch {
    packetLoss = null
  }

  return {
    host,
    latencyMs,
    packetLoss,
    reachable: latencyMs !== null || (packetLoss !== null && packetLoss < 100),
  }
}

async function getNetworkSnapshot() {
  const [interfaces, stats, connections] = await Promise.all([
    si.networkInterfaces().catch(() => [] as any),
    si.networkStats().catch(() => [] as any),
    si.networkConnections().catch(() => [] as any),
  ])

  const interfaceList = Array.isArray(interfaces) ? interfaces : [interfaces]
  const statsList = Array.isArray(stats) ? stats : [stats]
  const connectionList = Array.isArray(connections) ? connections : []

  const adapters = interfaceList
    .filter((item: any) => item && !item.internal)
    .map((item: any) => {
      const stat = statsList.find((entry: any) => entry?.iface === item.iface)
      return {
        iface: String(item.iface || ""),
        ifaceName: String(item.ifaceName || item.iface || ""),
        type: String(item.type || "unknown"),
        ip4: String(item.ip4 || ""),
        ip6: String(item.ip6 || ""),
        mac: String(item.mac || ""),
        dhcp: typeof item.dhcp === "boolean" ? item.dhcp : null,
        dnsSuffix: String(item.dnsSuffix || ""),
        default: Boolean(item.default),
        operstate: String(item.operstate || stat?.operstate || "unknown"),
        speedMbps: numberOrNull(item.speed),
        rxSec: numberOrNull(stat?.rx_sec),
        txSec: numberOrNull(stat?.tx_sec),
        rxBytes: numberOrNull(stat?.rx_bytes),
        txBytes: numberOrNull(stat?.tx_bytes),
      }
    })

  const active = adapters.find((item) => item.default && item.operstate === "up")
    || adapters.find((item) => item.operstate === "up")
    || adapters[0]
    || null

  const established = connectionList.filter((item: any) =>
    String(item?.state || "").toUpperCase() === "ESTABLISHED"
  ).length

  return {
    capturedAt: new Date().toISOString(),
    active,
    adapters,
    connections: {
      total: connectionList.length,
      established,
    },
  }
}

async function runDiagnostics() {
  const snapshot = await getNetworkSnapshot()
  const probes = await Promise.all([
    probeHost("1.1.1.1"),
    probeHost("8.8.8.8"),
  ])

  let dnsOk: boolean | null = null
  try {
    const script = `
$ErrorActionPreference = 'Stop'
$result = Resolve-DnsName -Name "github.com" -Type A -ErrorAction Stop | Select-Object -First 1
if ($result.IPAddress) { "true" } else { "false" }
`
    const response = await executePowerShell(null, { script, name: "network-center-dns-test" })
    if (response?.success) {
      const value = String(response.output || "").trim().toLowerCase()
      dnsOk = value === "true" ? true : value === "false" ? false : null
    }
  } catch {
    dnsOk = null
  }

  const validLatencies = probes
    .map((item) => item.latencyMs)
    .filter((value): value is number => value !== null)
  const validLoss = probes
    .map((item) => item.packetLoss)
    .filter((value): value is number => value !== null)

  const averageLatency = validLatencies.length
    ? Math.round(validLatencies.reduce((sum, value) => sum + value, 0) / validLatencies.length)
    : null
  const averageLoss = validLoss.length
    ? Math.round((validLoss.reduce((sum, value) => sum + value, 0) / validLoss.length) * 10) / 10
    : null

  const findings: Array<{
    level: "ok" | "attention" | "problem" | "info"
    title: string
    explanation: string
  }> = []

  if (!snapshot.active) {
    findings.push({
      level: "problem",
      title: "Nenhum adaptador de rede ativo detectado",
      explanation: "O Windows não informou uma interface de rede ativa para o Zevyron.",
    })
  } else {
    findings.push({
      level: "ok",
      title: `Adaptador ativo: ${snapshot.active.ifaceName || snapshot.active.iface}`,
      explanation: snapshot.active.ip4
        ? `IPv4 detectado: ${snapshot.active.ip4}.`
        : "O adaptador está ativo, mas o IPv4 não foi disponibilizado.",
    })
  }

  if (dnsOk === false) {
    findings.push({
      level: "problem",
      title: "Falha na resolução DNS",
      explanation: "O teste de resolução de nome falhou. Verifique DNS, conexão e firewall antes de alterar qualquer configuração.",
    })
  } else if (dnsOk === true) {
    findings.push({
      level: "ok",
      title: "Resolução DNS funcionando",
      explanation: "O Windows conseguiu resolver um nome público durante o diagnóstico.",
    })
  } else {
    findings.push({
      level: "info",
      title: "Teste DNS indisponível",
      explanation: "O teste não retornou dados suficientes. O Zevyron não assume falha quando não há medição.",
    })
  }

  if (averageLoss !== null && averageLoss > 5) {
    findings.push({
      level: "attention",
      title: "Perda de pacotes detectada",
      explanation: `A amostra curta apresentou cerca de ${averageLoss}% de perda. Repita o teste antes de concluir que há um problema permanente.`,
    })
  }

  if (averageLatency !== null && averageLatency > 100) {
    findings.push({
      level: "attention",
      title: "Latência elevada na amostra",
      explanation: `A latência média medida foi de aproximadamente ${averageLatency} ms. Distância do servidor, Wi-Fi e congestionamento podem influenciar.`,
    })
  }

  if (averageLatency === null) {
    findings.push({
      level: "info",
      title: "Latência não disponível",
      explanation: "Nenhuma fonte de latência retornou um valor confiável; por isso o Zevyron mostra indisponível em vez de zero.",
    })
  }

  return {
    measuredAt: new Date().toISOString(),
    snapshot,
    probes,
    dnsOk,
    averageLatency,
    averageLoss,
    findings,
  }
}

export function setupNetworkCenterHandlers(): void {
  ipcMain.handle("network-center:snapshot", async () => getNetworkSnapshot())
  ipcMain.handle("network-center:diagnose", async () => runDiagnostics())
}
