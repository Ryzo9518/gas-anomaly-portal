#!/usr/bin/env bash
# scripts/verify-client-isolation.sh
# Builds a per-client scoped bundle (VITE_CLIENT=<clientId>) and asserts that NO
# other client's identifying data appears in the JAVASCRIPT/CSS BUNDLE — the
# structural guarantee behind per-client logins.
#
#   STRICT (fails the script): a forbidden string found in assets/ (the bundle).
#     This is where the structured audit data lives; a hit here is a real leak.
#   WARN (does not fail): a forbidden string found in a STATIC public asset
#     (e.g. mock-report/*.html). These are shared placeholder files, not
#     tree-shakeable bundle data — they must be handled per-client at deploy
#     time before a real client link is sent. The warning makes that visible.
#
# Usage:
#   scripts/verify-client-isolation.sh <clientId> <forbidden> [more forbidden...]
# Example:
#   scripts/verify-client-isolation.sh newclient "Tourvest Travel Group" "Tourvest"
set -euo pipefail

CLIENT="${1:?usage: verify-client-isolation.sh <clientId> <forbidden string> [more...]}"
shift
if [ "$#" -lt 1 ]; then
  echo "Provide at least one forbidden string (another client's name/marker)." >&2
  exit 2
fi

OUT="dist-verify-${CLIENT}"
echo "Building scoped bundle: VITE_CLIENT=${CLIENT} -> ${OUT}"
VITE_CLIENT="${CLIENT}" npx vite build --outDir "${OUT}" >/dev/null

strict_fail=0
warned=0
for needle in "$@"; do
  # STRICT: the JS/CSS bundle must be clean.
  if [ -d "${OUT}/assets" ] && grep -rqF "${needle}" "${OUT}/assets" 2>/dev/null; then
    echo "LEAK (bundle): '${needle}' found in ${OUT}/assets — FAIL" >&2
    strict_fail=1
  else
    echo "OK (bundle): '${needle}' absent from ${OUT}/assets"
  fi
  # WARN: static public assets outside assets/.
  hits="$(grep -rlF "${needle}" "${OUT}" 2>/dev/null | grep -v "/assets/" || true)"
  if [ -n "${hits}" ]; then
    echo "WARN (static): '${needle}' present in shared static file(s):" >&2
    echo "${hits}" | sed 's/^/    /' >&2
    warned=1
  fi
done

rm -rf "${OUT}"

if [ "${strict_fail}" -ne 0 ]; then
  echo "ISOLATION FAILED for client '${CLIENT}' — structured data leaked into the bundle." >&2
  exit 1
fi
if [ "${warned}" -ne 0 ]; then
  echo "ISOLATION PASSED (bundle) for '${CLIENT}', but shared STATIC files contain a"
  echo "forbidden string. Handle those per-client before sending a real client link"
  echo "(e.g. the placeholder mock-report HTML)."
  exit 0
fi
echo "ISOLATION PASSED for client '${CLIENT}' (bundle + static both clean)."
