#!/usr/bin/env bash
set -euo pipefail
export PYTHONPATH="$(pwd)/src"
uvicorn utcj_microcredentials.app:app --host "${HOST:-0.0.0.0}" --port "${PORT:-8000}" --reload
