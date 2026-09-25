#!/usr/bin/env bash
set -e
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
if ! command -v node >/dev/null 2>&1; then
  printf '%s\n' 'Node.js is required. Install Node.js 24 LTS from https://nodejs.org/' 'Then rerun this launcher.' >&2
  exit 1
fi
if ! node -e "var v=process.versions.node.split('.');process.exit(+v[0]>22||(+v[0]===22&&+v[1]>=12)?0:1)"; then
  printf '%s\n' 'Node.js 22.12 or newer is required. Install Node.js 24 LTS from https://nodejs.org/' 'Then rerun this launcher.' >&2
  exit 1
fi
exec node scripts/start.mjs
