const fs = require("node:fs")
const path = require("node:path")
const pkg = require("./package.json")

const githubConfigPath = path.join(__dirname, "build", "github-release.json")
let github = { owner: "", repo: "Zevyron", configured: false }

if (fs.existsSync(githubConfigPath)) {
  github = { ...github, ...JSON.parse(fs.readFileSync(githubConfigPath, "utf8")) }
}

const owner = process.env.ZEVYRON_GITHUB_OWNER || github.owner
const repo = process.env.ZEVYRON_GITHUB_REPO || github.repo || "Zevyron"
const hasGithub = Boolean(owner && repo && (github.configured || process.env.ZEVYRON_GITHUB_OWNER))
const wantsPublish = process.argv.includes("--publish") && !process.argv.includes("never")
const version = String(pkg.version || "")
const updateChannel = version.includes("-alpha") || version.includes("-preview")
  ? "alpha"
  : version.includes("-beta")
    ? "beta"
    : "latest"

if (wantsPublish && !hasGithub) {
  throw new Error("GitHub Releases ainda não foi configurado. Execute: pnpm github:configure <usuario> [repositorio]")
}

module.exports = {
  ...pkg.build,
  publish: hasGithub
    ? [{ provider: "github", owner, repo, channel: updateChannel, releaseType: updateChannel === "latest" ? "release" : "prerelease" }]
    : undefined,
}
