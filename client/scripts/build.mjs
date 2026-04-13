import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const viteBin = path.resolve(projectRoot, "node_modules", "vite", "bin", "vite.js");

const rawArgs = process.argv.slice(2);
const forwardedFlags = rawArgs.filter((arg) => arg.startsWith("-"));
const ignoredArgs = rawArgs.filter((arg) => !arg.startsWith("-"));

if (ignoredArgs.length > 0) {
  console.warn(
    `[build] Ignoring unsupported positional args: ${ignoredArgs.join(", ")}.\n` +
      `[build] For APK, run: npm run build:android`,
  );
}

const result = spawnSync(process.execPath, [viteBin, "build", ...forwardedFlags], {
  cwd: projectRoot,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
