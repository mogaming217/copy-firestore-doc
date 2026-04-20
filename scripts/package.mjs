import { readFileSync, existsSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const distDir = resolve(root, "dist");

if (!existsSync(distDir)) {
  console.error("dist/ が存在しません。先に `npm run build` を実行してください。");
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const manifest = JSON.parse(
  readFileSync(resolve(distDir, "manifest.json"), "utf8"),
);

const outfile = resolve(root, `${pkg.name}-v${manifest.version}.zip`);
if (existsSync(outfile)) rmSync(outfile);

execSync(`zip -r "${outfile}" . -x "*.DS_Store"`, {
  cwd: distDir,
  stdio: "inherit",
});

console.log(`\nCreated: ${outfile}`);
