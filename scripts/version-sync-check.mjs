import fs from "node:fs";

const pkg = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const version = pkg.version;
const ref = process.env.GITHUB_REF_NAME || "";
const tagVersion = ref.startsWith("v") ? ref.slice(1) : ref;

console.log(`package.json version: ${version}`);
if (ref) console.log(`GitHub tag: ${ref}`);

if (ref && tagVersion !== version) {
  console.error(`Version mismatch: package.json=${version}, tag=${tagVersion}`);
  process.exit(1);
}

if (!/^\d+\.\d+\.\d+([-.][0-9A-Za-z.-]+)?$/.test(version)) {
  console.error(`Invalid semver: ${version}`);
  process.exit(1);
}

console.log("Version synchronization OK.");
