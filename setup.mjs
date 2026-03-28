#!/usr/bin/env node

import * as p from "@clack/prompts";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";

const ROOT = process.argv[2];
const BIN = process.argv[3];

if (!ROOT || !BIN) {
  console.error("Usage: setup.mjs <root-dir> <mcp-bin-path>");
  process.exit(1);
}

const VUE_DIR = path.join(ROOT, "client-app");
const MCP_DIR = path.join(ROOT, "excalidraw-mcp");

// ── Helpers ─────────────────────────────────────────────────────────

function exec(cmd, cwd) {
  execSync(cmd, { cwd, stdio: "pipe" });
}

function tildify(filePath) {
  const home = os.homedir();
  return filePath.startsWith(home) ? "~" + filePath.slice(home.length) : filePath;
}

function upsertJson(file, key, value) {
  let cfg = {};
  if (fs.existsSync(file)) {
    try {
      cfg = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      return { ok: false, reason: `${tildify(file)} exists but isn't valid JSON` };
    }
  }
  cfg[key] = { ...(cfg[key] || {}), excalidraw: value };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(cfg, null, 2) + "\n");
  return { ok: true, file };
}

function appendToml(file, sectionHeader, content) {
  let existing = "";
  if (fs.existsSync(file)) {
    try {
      existing = fs.readFileSync(file, "utf8");
    } catch {
      return { ok: false, reason: `Cannot read ${tildify(file)}` };
    }
    if (existing.includes(sectionHeader)) {
      return { ok: true, file, skipped: true };
    }
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, content);
  return { ok: true, file };
}

// ── MCP client definitions ──────────────────────────────────────────

const stdioEntry = { command: "node", args: [BIN, "--stdio"] };

const CLIENTS = {
  "claude-code": {
    label: "Claude Code",
    hint: "claude mcp add --scope user",
    register() {
      try {
        // Remove from both scopes in case it was previously registered either way
        try { exec(`claude mcp remove excalidraw`); } catch {}
        try { exec(`claude mcp remove --scope user excalidraw`); } catch {}
        exec(`claude mcp add --scope user excalidraw -- node "${BIN}" --stdio`);
        return { ok: true, detail: "user scope — available in all projects" };
      } catch (e) {
        return { ok: false, reason: `claude CLI failed: ${e.message?.split("\n")[0] ?? e}` };
      }
    },
  },

  "claude-desktop": {
    label: "Claude Desktop",
    hint: "config file",
    register() {
      const file =
        os.platform() === "darwin"
          ? path.join(os.homedir(), "Library", "Application Support", "Claude", "claude_desktop_config.json")
          : path.join(os.homedir(), ".config", "Claude", "claude_desktop_config.json");
      return upsertJson(file, "mcpServers", stdioEntry);
    },
  },

  vscode: {
    label: "VS Code / Copilot",
    hint: ".vscode/mcp.json",
    register() {
      return upsertJson(path.join(ROOT, ".vscode", "mcp.json"), "servers", {
        type: "stdio",
        ...stdioEntry,
      });
    },
  },

  cursor: {
    label: "Cursor",
    hint: "~/.cursor/mcp.json",
    register() {
      return upsertJson(
        path.join(os.homedir(), ".cursor", "mcp.json"),
        "mcpServers",
        stdioEntry,
      );
    },
  },

  windsurf: {
    label: "Windsurf",
    hint: "~/.codeium/windsurf/mcp_config.json",
    register() {
      return upsertJson(
        path.join(os.homedir(), ".codeium", "windsurf", "mcp_config.json"),
        "mcpServers",
        stdioEntry,
      );
    },
  },

  codex: {
    label: "Codex (OpenAI)",
    hint: "~/.codex/config.toml",
    register() {
      const file = path.join(os.homedir(), ".codex", "config.toml");
      const header = "[mcp_servers.excalidraw]";
      const content = `\n${header}\ncommand = "node"\nargs = ["${BIN}", "--stdio"]\n`;
      return appendToml(file, header, content);
    },
  },

  opencode: {
    label: "OpenCode",
    hint: "~/.config/opencode/opencode.json",
    register() {
      const file = path.join(os.homedir(), ".config", "opencode", "opencode.json");
      return upsertJson(file, "mcp", {
        type: "local",
        command: ["node", BIN, "--stdio"],
        enabled: true,
      });
    },
  },
};

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log("");
  p.intro("ExcalidrawBridge");

  // ── Install & Build ──

  const s = p.spinner();

  s.start("Installing client-app dependencies");
  try {
    exec("bun install", VUE_DIR);
    s.stop("client-app dependencies installed");
  } catch {
    s.stop("client-app install failed");
    p.log.error("Run manually: cd client-app && bun install");
    process.exit(1);
  }

  s.start("Installing MCP dependencies");
  try {
    exec("pnpm install", MCP_DIR);
    s.stop("MCP dependencies installed");
  } catch {
    s.stop("MCP install failed");
    p.log.error("Run manually: cd excalidraw-mcp && pnpm install");
    process.exit(1);
  }

  s.start("Building MCP server");
  try {
    exec("pnpm run build", MCP_DIR);
    s.stop("MCP server built");
  } catch {
    s.stop("Build failed");
    p.log.error("Run manually: cd excalidraw-mcp && pnpm run build");
    process.exit(1);
  }

  // ── Registration ──

  const selected = await p.multiselect({
    message: "Register MCP server with:",
    options: Object.entries(CLIENTS).map(([value, { label, hint }]) => ({
      value,
      label,
      hint,
    })),
    required: false,
  });

  if (p.isCancel(selected) || selected.length === 0) {
    p.outro("Ready \u2014 run \x1b[36mnpm run dev\x1b[0m");
    return;
  }

  // Register each selected client
  for (const id of selected) {
    const client = CLIENTS[id];
    const result = client.register();

    if (!result.ok) {
      p.log.warn(`${client.label}: ${result.reason}`);
    } else if (result.skipped) {
      p.log.info(`${client.label}: already registered`);
    } else if (result.detail) {
      p.log.success(`${client.label} (${result.detail})`);
    } else if (result.file) {
      p.log.success(`${client.label} \u2192 ${tildify(result.file)}`);
    } else {
      p.log.success(client.label);
    }
  }

  p.outro("Ready \u2014 run \x1b[36mnpm run dev\x1b[0m");
}

main();
