#!/usr/bin/env bash
# Railway web build: ensure PlatformIO is available, then build web + real firmware.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ensure_pio() {
  if command -v pio >/dev/null 2>&1; then
    return 0
  fi
  echo "pio not on PATH — attempting install…" >&2
  if command -v python3 >/dev/null 2>&1; then
    python3 -m pip install --user -U platformio
    export PATH="${HOME}/.local/bin:${PATH}"
  elif command -v python >/dev/null 2>&1; then
    python -m pip install --user -U platformio
    export PATH="${HOME}/.local/bin:${PATH}"
  fi
  if ! command -v pio >/dev/null 2>&1; then
    echo "PlatformIO (pio) is required. On Railway web service, either:" >&2
    echo "  - Use this build command: bash scripts/railway-build-web.sh" >&2
    echo "  - Set variable NIXPACKS_PKGS=platformio (repo includes nixpacks.toml)" >&2
    echo "  - Or use a custom image with python3 + pip install platformio" >&2
    exit 127
  fi
}

ensure_pio
export FIRMWARE_BUILD=real
exec pnpm build:web
