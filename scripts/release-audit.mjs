import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const errors = []
const warnings = []
const ok = (msg) => console.log(`✅ ${msg}`)
const fail = (msg) => { errors.push(msg); console.error(`❌ ${msg}`) }
const warn = (msg) => { warnings.push(msg); console.warn(`⚠️ ${msg}`) }
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')
const exists = (p) => fs.existsSync(path.join(root, p))

const pkg = JSON.parse(read('package.json'))
if (pkg.name !== 'zevyron') fail('package.json name must be zevyron'); else ok('Package identity')
if (pkg.author !== 'PrimeTools Lab') fail('package.json author must be PrimeTools Lab'); else ok('PrimeTools Lab attribution')
if (!/^\d+\.\d+\.\d+$/.test(pkg.version)) fail(`Invalid semantic version: ${pkg.version}`); else ok(`Version ${pkg.version}`)
if (pkg.build?.productName !== 'Zevyron' || pkg.build?.appId !== 'com.zevyron.app') fail('Electron product identity mismatch'); else ok('Electron identity')

for (const file of [
  'build/installerIcon.ico', 'build/zevyron-installer-header.bmp', 'build/zevyron-installer-sidebar.bmp',
  'resources/zevyron.ico', 'LICENSE', 'NOTICE.md', 'THIRD_PARTY_NOTICES.md', 'SOURCE_CODE.md',
  '.github/workflows/release.yml'
]) {
  if (!exists(file)) fail(`Required release file missing: ${file}`)
}

try {
  const gh = JSON.parse(read('build/github-release.json'))
  if (!gh.configured || !gh.owner || !gh.repo) fail('GitHub Releases configuration is incomplete')
  else ok(`GitHub Releases: ${gh.owner}/${gh.repo}`)
} catch { fail('build/github-release.json is invalid') }

const tweakRoot = path.join(root, 'tweaks')
const tweakDirs = fs.readdirSync(tweakRoot, { withFileTypes: true }).filter((d) => d.isDirectory())
let visible = 0, hidden = 0, nonReversible = 0
for (const entry of tweakDirs) {
  const dir = path.join(tweakRoot, entry.name)
  const metaPath = path.join(dir, 'meta.json')
  if (!fs.existsSync(metaPath)) { fail(`Missing meta.json: ${entry.name}`); continue }
  let meta
  try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')) } catch { fail(`Invalid meta.json: ${entry.name}`); continue }
  if (!meta.title || !meta.description) fail(`Incomplete metadata: ${entry.name}`)
  if (meta.hidden === true) { hidden++; continue }
  visible++
  const apply = path.join(dir, 'apply.ps1')
  const unapply = path.join(dir, 'unapply.ps1')
  if (entry.name !== 'optimize-nvidia-settings' && (!fs.existsSync(apply) || !fs.readFileSync(apply, 'utf8').trim())) fail(`Missing apply script: ${entry.name}`)
  if (meta.reversible !== false && (!fs.existsSync(unapply) || !fs.readFileSync(unapply, 'utf8').trim())) fail(`Missing rollback script: ${entry.name}`)
  if (meta.reversible === false) nonReversible++
}
ok(`Tweaks audited: ${visible} visible, ${hidden} hidden by safety policy, ${nonReversible} non-reversible`)

// Security regression checks.
const securityFiles = [
  'src/main/safetyEngine.ts', 'src/main/tweakHandler.ts', 'src/main/gameMode.ts', 'src/main/powershell.ts',
  'tweaks/debloat-windows/apply.ps1'
]
const securityText = securityFiles.map((f) => read(f)).join('\n')
if (/ScriptBlock\]::Create\(\(Invoke-RestMethod/i.test(securityText)) fail('Remote PowerShell execution pattern reintroduced')
else ok('No dynamic remote PowerShell execution')
if (!/Set-MpPreference/.test(read('src/main/safetyEngine.ts'))) fail('Safety Engine does not classify Defender modifications')
if (!/meta\.hidden === true/.test(read('src/main/tweakHandler.ts'))) fail('Hidden safety-policy tweaks are not filtered')
if (!/previousPriority/.test(read('src/main/gameMode.ts'))) fail('Game Mode does not preserve original game priority')

// Legacy branding scan while retaining required upstream attribution where explicitly documented.
for (const target of ['src', 'build', 'resources', 'package.json']) {
  const base = path.join(root, target)
  const files = fs.statSync(base).isDirectory()
    ? fs.readdirSync(base, { recursive: true, withFileTypes: true }).filter((d) => d.isFile()).map((d) => path.join(d.parentPath ?? d.path, d.name))
    : [base]
  for (const file of files) {
    let text = ''
    try { text = fs.readFileSync(file, 'utf8') } catch { continue }
    if (/getsparkle\.net|github\.com\/Parcoil\/Sparkle/i.test(text)) fail(`Legacy Sparkle infrastructure reference: ${path.relative(root, file)}`)
  }
}

const workflow = read('.github/workflows/release.yml')
if (!workflow.includes('contents: write')) fail('Workflow is missing contents: write')
if (!workflow.includes('pnpm run test')) fail('Workflow does not execute automated tests')
if (!workflow.includes('pnpm run audit:release')) fail('Workflow does not execute release audit')
if (!workflow.includes('gh release')) fail('Workflow is not using GitHub CLI release publishing')

if (warnings.length) console.log(`\nWarnings: ${warnings.length}`)
if (errors.length) {
  console.error(`\nRelease audit FAILED with ${errors.length} error(s).`)
  process.exit(1)
}
console.log(`\nRelease audit PASSED for Zevyron ${pkg.version}.`)
