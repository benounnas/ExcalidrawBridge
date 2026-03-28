#!/bin/sh
# ExcalidrawBridge — one-shot installer
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/benounnas/excalidraw-suite/master/install.sh | sh
#   sh install.sh                  # clone + init
#   sh install.sh --skip-clone     # init only (already cloned, run from repo root)

set -e

REPO_URL="https://github.com/benounnas/ExcalidrawBridge.git"
DEFAULT_DIR="excalidrawbridge"
SKIP_CLONE=0

# ── Parse args ──────────────────────────────────────────────────────
for arg in "$@"; do
  case "$arg" in
    --skip-clone) SKIP_CLONE=1 ;;
    *) echo "Unknown option: $arg"; exit 1 ;;
  esac
done

# ── Colors ───────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
RESET='\033[0m'

ok()   { printf "  ${GREEN}✔${RESET}  %s\n" "$1"; }
info() { printf "  ${CYAN}→${RESET}  %s\n" "$1"; }
warn() { printf "  ${YELLOW}!${RESET}  %s\n" "$1"; }
fail() { printf "  ${RED}✖${RESET}  %s\n" "$1"; exit 1; }

# ── Prerequisite checks ──────────────────────────────────────────────
echo ""
echo "  ExcalidrawBridge — installer"
echo ""

command -v git  >/dev/null 2>&1 || fail "git is required  — https://git-scm.com"
command -v node >/dev/null 2>&1 || fail "node is required — https://nodejs.org"
command -v bun  >/dev/null 2>&1 || fail "bun is required  — https://bun.sh"
command -v pnpm >/dev/null 2>&1 || fail "pnpm is required — npm i -g pnpm"

ok "Prerequisites satisfied"

# ── Clone ────────────────────────────────────────────────────────────
if [ "$SKIP_CLONE" = "0" ]; then
  printf "  Install directory [%s]: " "$DEFAULT_DIR"
  read -r INSTALL_DIR < /dev/tty
  INSTALL_DIR="${INSTALL_DIR:-$DEFAULT_DIR}"

  if [ -d "$INSTALL_DIR" ]; then
    warn "Directory '$INSTALL_DIR' already exists — skipping clone"
  else
    info "Cloning into $INSTALL_DIR ..."
    git clone "$REPO_URL" "$INSTALL_DIR"
    ok "Cloned"
  fi

  cd "$INSTALL_DIR"
fi

# ── Init ─────────────────────────────────────────────────────────────
info "Running init (install deps, build, register editors) ..."
echo ""
npm run init < /dev/tty

# ── Done ─────────────────────────────────────────────────────────────
echo ""
ok "Setup complete"
echo ""
echo "  Start the suite:"
printf "    ${CYAN}npm run dev${RESET}\n"
echo ""
