#!/usr/bin/env node

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawn, execSync } from "node:child_process";
import { createServer } from "node:net";
import { readFileSync, existsSync } from "node:fs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const MCP_BIN = join(ROOT, "excalidraw-mcp", "dist", "index.js");

// ── Helpers ─────────────────────────────────────────────────────────

function loadEnv() {
  const defaults = { PORT: "9821", WS_PORT: "9822" };
  const envPath = join(ROOT, ".env");
  if (!existsSync(envPath)) return defaults;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    const v = line.slice(eq + 1).trim();
    if (k) defaults[k] = v;
  }
  return defaults;
}

function checkPort(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => { server.close(); resolve(true); });
    server.listen(Number(port), "127.0.0.1");
  });
}

function hasCommand(cmd) {
  try { execSync(`command -v ${cmd}`, { stdio: "pipe" }); return true; }
  catch { return false; }
}

// ── Commands ─────────────────────────────────────────────────────────

async function init() {
  const checks = [
    ["node", "https://nodejs.org"],
    ["bun",  "https://bun.sh"],
    ["pnpm", "npm i -g pnpm"],
  ];
  for (const [cmd, url] of checks) {
    if (!hasCommand(cmd)) {
      console.error(`\x1b[31m  ${cmd} is required — ${url}\x1b[0m`);
      process.exit(1);
    }
  }

  // Install root deps first (setup.mjs needs @clack/prompts)
  try {
    execSync("npm install --no-audit --no-fund", { cwd: ROOT, stdio: "inherit" });
  } catch {
    console.error("\x1b[31m  Failed to install root dependencies\x1b[0m");
    process.exit(1);
  }

  const child = spawn("node", [join(ROOT, "setup.mjs"), ROOT, MCP_BIN], {
    stdio: "inherit",
  });
  child.on("exit", (code) => process.exit(code ?? 0));
}

async function dev() {
  const { PORT, WS_PORT } = loadEnv();

  for (const port of [PORT, WS_PORT]) {
    const free = await checkPort(port);
    if (!free) {
      console.error(`\n  \x1b[31mPort ${port} is already in use.\x1b[0m`);
      console.error(`  Run \x1b[33mlsof -i :${port}\x1b[0m to find the process, kill it, then rerun.\n`);
      process.exit(1);
    }
  }

  console.log("");
  console.log(`  \x1b[36mClient\x1b[0m  http://localhost:5173`);
  console.log(`  \x1b[36mMCP\x1b[0m     http://localhost:${PORT}/mcp`);
  console.log(`  \x1b[36mWS\x1b[0m      ws://localhost:${WS_PORT}`);
  console.log("");

  const client = spawn("bun", ["run", "dev"], {
    cwd: join(ROOT, "client-app"),
    stdio: "inherit",
    env: { ...process.env, VITE_WS_PORT: WS_PORT },
  });

  const mcp = spawn("pnpm", ["run", "dev"], {
    cwd: join(ROOT, "excalidraw-mcp"),
    stdio: "inherit",
    env: { ...process.env, PORT, WS_PORT },
  });

  function cleanup() {
    client.kill();
    mcp.kill();
    process.exit(0);
  }

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  client.on("exit", (code) => { if (code !== 0) { mcp.kill(); process.exit(code); } });
  mcp.on("exit", (code) => { if (code !== 0) { client.kill(); process.exit(code); } });
}

// ── Entry ────────────────────────────────────────────────────────────

const cmd = process.argv[2];

if (!cmd || cmd === "init") {
  init();
} else if (cmd === "dev") {
  dev();
} else {
  console.error(`Unknown command: ${cmd}\nUsage: npx . [init|dev]`);
  process.exit(1);
}
