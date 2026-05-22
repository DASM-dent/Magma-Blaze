const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");
const cacheRoot = path.join(projectRoot, ".cache");
const legacyDevDir = path.join(projectRoot, ".next-dev");
const distPrefix = "next-dev";
const nextDistDir = path.posix.join(".cache", distPrefix);

function ensureSafePath(targetPath) {
  const relative = path.relative(projectRoot, targetPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Ruta insegura para limpiar: ${targetPath}`);
  }
}

async function removeIfExists(targetPath) {
  ensureSafePath(targetPath);
  await fs.promises.rm(targetPath, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 250,
  });
}

async function cleanOldDevDirs() {
  await fs.promises.mkdir(cacheRoot, { recursive: true });

  const entries = await fs.promises.readdir(cacheRoot, { withFileTypes: true });
  const staleDirs = entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(distPrefix))
    .map((entry) => path.join(cacheRoot, entry.name));

  await Promise.all(staleDirs.map((targetPath) => removeIfExists(targetPath)));
  await removeIfExists(legacyDevDir);
}

async function main() {
  await cleanOldDevDirs();

  const nextBin = require.resolve("next/dist/bin/next", { paths: [projectRoot] });
  const env = {
    ...process.env,
    NEXT_DIST_DIR: nextDistDir,
  };

  console.log(`[dev-next] Usando NEXT_DIST_DIR=${nextDistDir}`);

  const child = spawn(process.execPath, [nextBin, "dev", "-p", "3000"], {
    cwd: projectRoot,
    env,
    stdio: "inherit",
  });

  const forwardSignal = (signal) => {
    if (!child.killed) {
      child.kill(signal);
    }
  };

  process.on("SIGINT", () => forwardSignal("SIGINT"));
  process.on("SIGTERM", () => forwardSignal("SIGTERM"));

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error("[dev-next] No se pudo iniciar el entorno web.");
  console.error(error);
  process.exit(1);
});
