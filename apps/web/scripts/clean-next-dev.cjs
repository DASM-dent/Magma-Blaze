const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const requestedDir = process.argv[2] || process.env.NEXT_DIST_DIR || '.next';
const allowedDirs = new Set(['.next', '.next-dev']);

if (!allowedDirs.has(requestedDir)) {
  console.error(`[clean-next-dev] Carpeta no permitida: ${requestedDir}`);
  process.exit(1);
}

const nextDir = path.join(projectRoot, requestedDir);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function removeNextDir() {
  const relative = path.relative(projectRoot, nextDir);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Ruta insegura para limpiar: ${nextDir}`);
  }

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      await fs.promises.rm(nextDir, {
        recursive: true,
        force: true,
        maxRetries: 3,
        retryDelay: 200,
      });
      return;
    } catch (error) {
      if (attempt === 5) throw error;
      await sleep(250 * attempt);
    }
  }
}

removeNextDir().catch((error) => {
  console.error(`[clean-next-dev] No se pudo limpiar apps/web/${requestedDir}.`);
  console.error(error);
  process.exit(1);
});
