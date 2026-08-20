import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const here = path.dirname(__filename)
const root = path.resolve(here, "..")
const failures = []
const warnings = []

const ok = (condition, message) => {
  if (condition) console.log(`✅ ${message}`)
  else {
    console.error(`❌ ${message}`)
    failures.push(message)
  }
}
const warn = (condition, message) => {
  if (condition) console.log(`✅ ${message}`)
  else {
    console.warn(`⚠️ ${message}`)
    warnings.push(message)
  }
}
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8")
const exists = (rel) => fs.existsSync(path.join(root, rel))

const pkg = JSON.parse(read("package.json"))
const version = String(pkg.version || "")

console.log(`\nZevyron Stability Audit — ${version}\n`)

ok(/^3\.0\.\d+(?:-(?:beta|alpha|preview|rc)\.\d+)?$/.test(version), "3.0 version format is valid")
ok(pkg.name === "zevyron", "Package identity is Zevyron")
ok(Boolean(pkg.build?.generateUpdatesFilesForAllChannels), "All update-channel metadata generation is enabled")

const requiredMain = [
  "src/main/updates.ts",
  "src/main/safetyEngine.ts",
  "src/main/gameMode.ts",
  "src/main/pcHealth.ts",
  "src/main/startupManager.ts",
  "src/main/smartCleanup.ts",
  "src/main/networkCenter.ts",
  "src/main/hardwareMonitor.ts",
  "src/main/reportCenter.ts",
  "src/main/repairZevyron.ts",
  "src/main/updateHistory.ts",
]
requiredMain.forEach((rel) => ok(exists(rel), `Main module present: ${rel}`))

const requiredPages = [
  "Home.tsx",
  "Health.tsx",
  "Recovery.tsx",
  "Startup.tsx",
  "NetworkCenter.tsx",
  "HardwareMonitor.tsx",
  "Notifications.tsx",
  "Reports.tsx",
  "ExpertMode.tsx",
  "Repair.tsx",
  "Accessibility.tsx",
  "GameMode.tsx",
  "Tweaks.tsx",
  "Debloat.tsx",
  "Clean.tsx",
  "Backup.tsx",
  "Utilities.tsx",
  "DNS.tsx",
  "Apps.tsx",
  "Settings.tsx",
  "About.tsx",
]
requiredPages.forEach((name) =>
  ok(exists(`src/renderer/src/pages/${name}`), `Page present: ${name}`)
)

const appText = read("src/renderer/src/App.tsx")
const requiredRoutes = [
  "/", "/health", "/recovery", "/startup", "/network", "/hardware",
  "/notifications", "/reports", "/expert", "/repair", "/accessibility",
  "/game-mode", "/tweaks", "/debloat", "/clean", "/backup", "/utilities",
  "/dns", "/apps", "/settings", "/about",
]
requiredRoutes.forEach((route) =>
  ok(
    new RegExp(`path=["']${route === "/" ? "\\/" : route.replaceAll("/", "\\/")}["']`).test(appText),
    `Route registered: ${route}`
  )
)

const updatesText = read("src/main/updates.ts")
ok(updatesText.includes('autoUpdater.allowDowngrade = false'), "Automatic downgrade is disabled")
ok(updatesText.includes('updater:set-channel'), "Update-channel switching handler exists")
ok(updatesText.includes('allowPrerelease'), "Prerelease handling exists")

const workflow = read(".github/workflows/release.yml")
ok(workflow.includes("pnpm install --frozen-lockfile"), "CI uses frozen lockfile")
ok(workflow.includes("pnpm run check:version-sync"), "CI validates tag/version synchronization")
ok(workflow.includes("pnpm run typecheck"), "CI runs TypeScript validation")
ok(workflow.includes("pnpm run test"), "CI runs automated tests")
ok(workflow.includes("pnpm run audit:release"), "CI runs release audit")
ok(workflow.includes("--prerelease"), "CI marks beta/preview releases as prerelease")

const allCodeFiles = []
function walk(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".git", "dist", "out"].includes(item.name)) continue
    const full = path.join(dir, item.name)

    // Do not scan the stability audit itself; it necessarily contains the
    // forbidden patterns as regex literals used to detect unsafe code.
    if (path.resolve(full) === path.resolve(__filename)) continue

    if (item.isDirectory()) walk(full)
    else if (/\.(ts|tsx|js|mjs|cjs|ps1|nsh)$/i.test(item.name)) allCodeFiles.push(full)
  }
}
walk(root)

const code = allCodeFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n")

function findPatternInFiles(pattern) {
  const matches = []
  for (const file of allCodeFiles) {
    const content = fs.readFileSync(file, "utf8")
    const lines = content.split(/\r?\n/)
    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        matches.push({
          file: path.relative(root, file).replaceAll("\\", "/"),
          line: index + 1,
          text: line.trim().slice(0, 220),
        })
      }
      pattern.lastIndex = 0
    })
  }
  return matches
}

function safePatternCheck(pattern, message) {
  const matches = findPatternInFiles(pattern)
  if (matches.length === 0) {
    ok(true, message)
    return
  }

  console.error(`❌ ${message}`)
  console.error("   Offending file(s):")
  for (const match of matches) {
    console.error(`   - ${match.file}:${match.line}`)
    console.error(`     ${match.text}`)
  }
  failures.push(message)
}

safePatternCheck(
  /Invoke-Expression\s*\(\s*\(?\s*Invoke-WebRequest/mi,
  "No remote PowerShell pipe-to-execute pattern",
)
safePatternCheck(
  /iex\s*\(\s*iwr/mi,
  "No abbreviated remote PowerShell execution pattern",
)
safePatternCheck(
  /Set-MpPreference\s+-DisableRealtimeMonitoring\s+\$true/i,
  "No Defender realtime protection disable command",
)
safePatternCheck(
  /Set-NetFirewallProfile.+-Enabled\s+False/i,
  "No blanket Windows Firewall disable command",
)

const tweaksText = read("src/renderer/src/pages/Tweaks.tsx")
ok(tweaksText.includes('tweak.safety?.level !== "advanced"'), "Advanced tweaks are gated by Expert Mode")
ok(tweaksText.includes("Ajuda integrada"), "Integrated tweak help is present")

const firstRun = read("src/renderer/src/components/firsttime.tsx")
ok(firstRun.includes("Nenhuma otimização será aplicada automaticamente"), "First-run wizard does not auto-apply optimizations")

const notifications = read("src/renderer/src/lib/notifications.ts")
ok(notifications.includes("localStorage"), "Notification history is local")

const packageText = read("package.json")
const activePosthogUsage =
  /from\s+["']posthog-js["']/i.test(code) ||
  /require\(\s*["']posthog-js["']\s*\)/i.test(code) ||
  /["']posthog-js["']\s*:/i.test(packageText)
warn(!activePosthogUsage, "No active PostHog telemetry package/import detected")

const updaterBuilder = read("electron-builder.config.cjs")
ok(updaterBuilder.includes("channel: updateChannel"), "Builder uses explicit update channel")
ok(updaterBuilder.includes('releaseType: updateChannel === "latest" ? "release" : "prerelease"'), "Builder differentiates stable/prerelease")

console.log(`\nWarnings: ${warnings.length}`)
console.log(`Failures: ${failures.length}`)
if (failures.length) process.exit(1)
console.log("\n✅ Stability audit PASSED\n")
