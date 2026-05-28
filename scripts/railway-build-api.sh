#!/usr/bin/env bash
# Railway API build: compile packages/db + apps/api (dist/ is gitignored; must run at deploy build time).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "Building API (packages/db + apps/api)…" >&2
exec pnpm build:api
