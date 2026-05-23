#!/usr/bin/env bash
# Railway Railpack web build: install PlatformIO at build time, then pnpm build:web + real firmware.
# buildAptPackages in railpack.json (or RAILPACK_BUILD_APT_PACKAGES) supply python3/pip/gcc — not in the deploy image.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

install_platformio() {
  if command -v pio >/dev/null 2>&1; then
    return 0
  fi

  echo "Installing PlatformIO via pip…" >&2

  if ! command -v python3 >/dev/null 2>&1; then
    echo "python3 missing. On Railway web service set:" >&2
    echo "  RAILPACK_BUILD_APT_PACKAGES=python3,python3-pip,python3-venv,build-essential,git,curl,xz-utils" >&2
    echo "  (repo includes railpack.json with buildAptPackages for Railpack)" >&2
    exit 127
  fi

  if python3 -m pip install --user -U platformio 2>/dev/null; then
    :
  elif python3 -m pip install --user -U platformio --break-system-packages; then
    :
  else
    echo "pip install platformio failed" >&2
    exit 1
  fi

  export PATH="${HOME}/.local/bin:${PATH}"
  command -v pio >/dev/null 2>&1 || { echo "pio not on PATH after pip install" >&2; exit 127; }
}

install_platformio
export FIRMWARE_BUILD=real
exec pnpm build:web
