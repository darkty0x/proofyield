#!/usr/bin/env bash
set -euo pipefail
SVC="${RAILWAY_SERVICE_NAME:-proofyield-api}"
if [[ "$SVC" == *"web"* ]]; then
  exec npm run start -w @proofyield/web
else
  exec npm run start -w @proofyield/agent
fi
