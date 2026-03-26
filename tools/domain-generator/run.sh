#!/bin/bash
# Convenience wrapper: compiles TypeScript → runs Node.js
# Usage: ./tools/domain-generator/run.sh [same args as generate.ts]

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="/tmp/ngx-prime-domain-gen-build"

# Compile if sources are newer than build
NEEDS_BUILD=0
if [ ! -f "$BUILD_DIR/generate.js" ]; then
  NEEDS_BUILD=1
else
  for src in "$SCRIPT_DIR"/*.ts; do
    if [ "$src" -nt "$BUILD_DIR/generate.js" ]; then
      NEEDS_BUILD=1
      break
    fi
  done
fi

if [ "$NEEDS_BUILD" = "1" ]; then
  echo "Compiling TypeScript..."
  npx tsc --outDir "$BUILD_DIR" --module commonjs --target es2020 \
    --moduleResolution node --esModuleInterop --skipLibCheck \
    "$SCRIPT_DIR/generate.ts" 2>&1
fi

node "$BUILD_DIR/generate.js" "$@"
