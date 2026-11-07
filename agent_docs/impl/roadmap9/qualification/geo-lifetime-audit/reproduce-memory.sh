#!/bin/sh
set -eu
if [ "$#" -ne 2 ]; then
  printf '%s\n' 'Usage: reproduce-memory.sh /absolute/final-archive.tgz /absolute/output-directory' >&2
  exit 2
fi
case "$1" in /*) ;; *) exit 2;; esac
case "$2" in /*) ;; *) exit 2;; esac
repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/../../../../.." && pwd)
cd "$repo_root"
# Use the unchanged canonical lifecycle, original 5 warmups and 100 cycles.
exec node scripts/benchmark-native.js --archive="$1" --output="$2" --workload=memory
