const { execFileSync, spawn } = require("child_process");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const targetPorts = [3000, 4000];
const safeProcessNames = new Set(["node", "node.exe"]);

function runPowerShell(script) {
  return execFileSync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", script],
    {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  ).trim();
}

function normalizeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function getListeningProcesses() {
  const script = `
    $ports = ${targetPorts.join(",")}
    $connections = @(Get-NetTCPConnection -LocalPort $ports -State Listen -ErrorAction SilentlyContinue |
      Select-Object -Property LocalPort,OwningProcess -Unique
    )

    if (-not $connections -or $connections.Count -eq 0) {
      exit 0
    }

    $result = foreach ($connection in $connections) {
      $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
      if ($process) {
        [PSCustomObject]@{
          port = $connection.LocalPort
          pid = $connection.OwningProcess
          name = $process.ProcessName
        }
      }
    }

    if ($result) {
      $result | ConvertTo-Json -Compress
    }
  `;

  const output = runPowerShell(script);
  if (!output) return [];

  try {
    return normalizeArray(JSON.parse(output));
  } catch (error) {
    console.error("[dev] No se pudo interpretar el estado de los puertos.");
    console.error(output);
    throw error;
  }
}

function stopSafeProcesses(processes) {
  const stoppable = processes.filter((processInfo) =>
    safeProcessNames.has(String(processInfo.name).toLowerCase()),
  );
  const blocked = processes.filter(
    (processInfo) => !safeProcessNames.has(String(processInfo.name).toLowerCase()),
  );

  if (blocked.length) {
    console.error("[dev] Hay puertos ocupados por procesos que no son Node.js:");
    for (const processInfo of blocked) {
      console.error(
        `  - Puerto ${processInfo.port}: PID ${processInfo.pid} (${processInfo.name})`,
      );
    }
    console.error(
      "[dev] Cierra esos procesos manualmente o cambia los puertos antes de volver a intentar.",
    );
    process.exit(1);
  }

  const seenPids = new Set();
  for (const processInfo of stoppable) {
    if (seenPids.has(processInfo.pid)) continue;
    seenPids.add(processInfo.pid);
    console.log(
      `[dev] Liberando puerto ${processInfo.port} (PID ${processInfo.pid}, ${processInfo.name}).`,
    );
    execFileSync("taskkill", ["/PID", String(processInfo.pid), "/T", "/F"], {
      cwd: projectRoot,
      stdio: "ignore",
    });
  }
}

function pipeWithPrefix(stream, output, prefix) {
  let buffer = "";

  stream.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      output.write(`[${prefix}] ${line}\n`);
    }
  });

  stream.on("end", () => {
    if (buffer) {
      output.write(`[${prefix}] ${buffer}\n`);
      buffer = "";
    }
  });
}

function killProcessTree(pid) {
  execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
    cwd: projectRoot,
    stdio: "ignore",
  });
}

function startDevServers() {
  const services = [
    { name: "api", args: ["run", "dev:api"] },
    { name: "web", args: ["run", "dev:web"] },
  ];
  const children = new Map();
  let shuttingDown = false;
  let exitedCount = 0;

  const stopAll = (exceptPid) => {
    for (const child of children.values()) {
      if (exceptPid && child.pid === exceptPid) continue;
      if (!child.killed) {
        try {
          killProcessTree(child.pid);
        } catch (_error) {
          // The child may already be shutting down. Ignore and keep going.
        }
      }
    }
  };

  const handleExit = (serviceName, code, signal, childPid) => {
    exitedCount += 1;

    if (!shuttingDown && (code ?? 0) !== 0) {
      shuttingDown = true;
      console.error(
        `[dev] El servicio ${serviceName} termino con ${signal ? `senal ${signal}` : `codigo ${code}`}.`,
      );
      stopAll(childPid);
      process.exit(code ?? 1);
    }

    if (!shuttingDown && exitedCount === services.length) {
      process.exit(0);
    }
  };

  for (const service of services) {
    const command = process.platform === "win32" ? "cmd.exe" : "npm";
    const args =
      process.platform === "win32"
        ? ["/d", "/s", "/c", `npm ${service.args.join(" ")}`]
        : service.args;

    const child = spawn(command, args, {
      cwd: projectRoot,
      env: process.env,
      stdio: ["inherit", "pipe", "pipe"],
      shell: false,
    });

    children.set(service.name, child);
    pipeWithPrefix(child.stdout, process.stdout, service.name);
    pipeWithPrefix(child.stderr, process.stderr, service.name);
    child.on("exit", (code, signal) => handleExit(service.name, code, signal, child.pid));
  }

  const forwardSignal = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    stopAll();
    process.exit(0);
  };

  process.on("SIGINT", () => forwardSignal("SIGINT"));
  process.on("SIGTERM", () => forwardSignal("SIGTERM"));
}

function main() {
  const processes = getListeningProcesses();
  if (processes.length > 0) {
    stopSafeProcesses(processes);
  }
  startDevServers();
}

try {
  main();
} catch (error) {
  console.error("[dev] No se pudo iniciar el entorno local.");
  console.error(error);
  process.exit(1);
}
