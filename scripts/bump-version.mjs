#!/usr/bin/env node
/**
 * Sets the app version everywhere it lives:
 *   - package.json            (tauri.conf.json reads its version from here)
 *   - src-tauri/Cargo.toml
 *
 * Usage: pnpm version:bump 0.2.0
 */
import { readFileSync, writeFileSync } from "node:fs";

const version = process.argv[2];
if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version ?? "")) {
  console.error("Usage: pnpm version:bump <x.y.z>");
  process.exit(1);
}

const pkgPath = new URL("../package.json", import.meta.url);
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
pkg.version = version;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

const cargoPath = new URL("../src-tauri/Cargo.toml", import.meta.url);
const cargo = readFileSync(cargoPath, "utf8");
// Only the first `version = ` line, which belongs to [package].
writeFileSync(cargoPath, cargo.replace(/^version = ".*"$/m, `version = "${version}"`));

console.log(`Version set to ${version}. Next:
  1. Update CHANGELOG.md
  2. git commit -am "chore: release v${version}"
  3. git tag v${version} && git push --follow-tags`);
