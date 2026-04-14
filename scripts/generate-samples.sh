#!/usr/bin/env bash
set -euo pipefail
export PYTHONPATH="$(pwd)/src"
python -m utcj_microcredentials.scripts.generate_samples
