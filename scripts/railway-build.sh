#!/usr/bin/env bash
set -euo pipefail
SVC="${RAILWAY_SERVICE_NAME:-proofyield-api}"
if [[ "$SVC" == *"web"* ]]; then
  npm run build -w @proofyield/web
else
  echo "API service — no compile step"
fi
