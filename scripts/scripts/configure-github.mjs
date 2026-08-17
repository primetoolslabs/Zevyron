import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")
const owner = (process.argv[2] || "").trim()
const repo = (process.argv[3] || "Zevyron").trim()

if (!owner) {
  console.error("\nUso: pnpm github:configure <usuario-ou-organizacao> [repositorio]\n")
  console.error("Exemplo: pnpm github:configure PrimetoolsLabs Zevyron\n")
  process.exit(1)
}

if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(owner)) {
  console.error("Nome de usuário/organização do GitHub inválido.")
  process.exit(1)
}
if (!/^[A-Za-z0-9._-]+$/.test(repo)) {
  console.error("Nome de repositório inválido.")
  process.exit(1)
}

const config = { owner, repo, configured: true }
fs.writeFileSync(path.join(root, "build", "github-release.json"), JSON.stringify(config, null, 2) + "\n")

const sourceUrl = `https://github.com/${owner}/${repo}`

const packagePath = path.join(root, "package.json")
const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"))
pkg.repository = { type: "git", url: `git+${sourceUrl}.git` }
pkg.homepage = `${sourceUrl}#readme`
pkg.bugs = { url: `${sourceUrl}/issues` }
fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + "\n")
const sourceMd = `# Código-fonte do Zevyron\n\nO Zevyron é distribuído gratuitamente sob a GNU General Public License version 3 (GPLv3).\n\nCódigo-fonte oficial desta distribuição:\n\n${sourceUrl}\n\nOs Releases oficiais e arquivos de atualização são publicados em:\n\n${sourceUrl}/releases\n\nAo distribuir uma versão modificada, cumpra os termos da GPLv3 e disponibilize o código-fonte correspondente conforme aplicável.\n`
fs.writeFileSync(path.join(root, "SOURCE_CODE.md"), sourceMd)

const envExample = `# Apenas para publicação local. Nunca coloque um token real neste arquivo.\nGH_TOKEN=github_token_aqui\nZEVYRON_GITHUB_OWNER=${owner}\nZEVYRON_GITHUB_REPO=${repo}\n`
fs.writeFileSync(path.join(root, ".env.release.example"), envExample)

console.log("\n✓ GitHub Releases configurado para o Zevyron")
console.log(`  Repositório: ${sourceUrl}`)
console.log(`  Updates:     ${sourceUrl}/releases`)
console.log("\nPróximos passos:")
console.log("  1. Envie o projeto para esse repositório público.")
console.log("  2. Crie uma tag, por exemplo: v2.24.1")
console.log("  3. O GitHub Actions criará/publicará o Release automaticamente.\n")
