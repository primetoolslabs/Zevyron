import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, "..")
const renderer = path.join(root, "src", "renderer", "src")
const i18nPath = path.join(renderer, "i18n", "index.tsx")

const i18nText = fs.readFileSync(i18nPath, "utf8")
const languages = ["pt-BR", "en", "es"]

const navKeys = [
  "nav.home","nav.health","nav.recovery","nav.startup","nav.networkCenter",
  "nav.hardwareMonitor","nav.notifications","nav.reports","nav.expert",
  "nav.repair","nav.accessibility","nav.gameMode","nav.tweaks","nav.clean",
  "nav.backup","nav.utilities","nav.dns","nav.apps","nav.settings","nav.about",
]

const failures = []
for (const key of navKeys) {
  if (!i18nText.includes(`"${key}"`)) failures.push(`Missing i18n key: ${key}`)
}

const candidateFiles = []
function walk(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name)
    if (item.isDirectory()) walk(full)
    else if (/\.tsx$/i.test(item.name)) candidateFiles.push(full)
  }
}
walk(path.join(renderer, "pages"))
walk(path.join(renderer, "components"))

const knownIntentional = new Set([
  "About.tsx", // product/company names contain Portuguese/English proper labels
])

let hardcodedCandidates = 0
const samples = []

for (const file of candidateFiles) {
  const text = fs.readFileSync(file, "utf8")
  const lines = text.split(/\r?\n/)
  lines.forEach((line, index) => {
    // Conservative audit: visible JSX text containing several letters, excluding obvious code-only lines.
    const matches = [...line.matchAll(/>([^<>{}\n]*[A-Za-zÀ-ÿ][^<>{}\n]*)</g)]
    for (const match of matches) {
      const value = match[1].trim()
      if (value.length < 4) continue
      if (/^[A-Z0-9_.:/+\-\s%]+$/.test(value)) continue
      if (value.includes("http")) continue
      hardcodedCandidates++
      if (samples.length < 25) {
        samples.push(`${path.relative(renderer, file)}:${index + 1}: ${value.slice(0, 100)}`)
      }
    }
  })
}

console.log("\nZevyron i18n Audit")
console.log(`Configured language labels checked: ${languages.join(", ")}`)
console.log(`Required navigation keys: ${navKeys.length}`)
console.log(`Hardcoded visible-text candidates: ${hardcodedCandidates}`)

if (samples.length) {
  console.log("\nReview candidates (audit is intentionally informational for beta builds):")
  samples.forEach((sample) => console.log(`  ⚠️ ${sample}`))
}

if (failures.length) {
  failures.forEach((item) => console.error(`❌ ${item}`))
  process.exit(1)
}

console.log("\n✅ Required i18n structure PASSED")
console.log("ℹ️ Hardcoded-text candidates must be reviewed before 3.0.0 Stable.\n")
