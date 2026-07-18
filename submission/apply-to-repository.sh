#!/usr/bin/env bash
set -euo pipefail
SOURCE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET_ROOT="${1:-.}"
TARGET_ROOT="$(cd "$TARGET_ROOT" && pwd)"

while IFS= read -r path; do
  [[ -z "$path" || "$path" == \#* ]] && continue
  rm -rf "$TARGET_ROOT/$path"
done < "$SOURCE_ROOT/submission/DELETE_PATHS.txt"

rsync -a --delete-delay \
  --exclude '.git/' \
  --exclude 'node_modules/' \
  "$SOURCE_ROOT/" "$TARGET_ROOT/"

echo "Applied qingxier V2.0 snapshot to $TARGET_ROOT"
