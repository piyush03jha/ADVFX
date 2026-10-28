#!/usr/bin/env bash
set -Eeuo pipefail

# Read-only asset delivery comparison. This does not change DNS or Cloudflare settings.
# Usage:
#   API_BASE_URL=https://api.voxel3d.org \
#   RAILWAY_ORIGIN_HOST=e1p6d3up.up.railway.app \
#   ASSET_PATH='/products/<product-id>/<published-file>.webp' \
#   bash scripts/asset-proxy-diagnostic.sh
#
# Optional:
#   MISSING_PATH='/products/not-a-real-product/not-found.webp'
#   REPEATS=5

API_BASE_URL="${API_BASE_URL:-https://api.voxel3d.org}"
RAILWAY_ORIGIN_HOST="${RAILWAY_ORIGIN_HOST:-e1p6d3up.up.railway.app}"
ASSET_PATH="${ASSET_PATH:-}"
MISSING_PATH="${MISSING_PATH:-/products/voxel3d-diagnostic-missing/not-found.webp}"
REPEATS="${REPEATS:-5}"

if [[ -z "$ASSET_PATH" ]]; then
  echo "ERROR: set ASSET_PATH to a known, published product image path." >&2
  exit 2
fi
if [[ "$ASSET_PATH" != /* || "$ASSET_PATH" == *$'\n'* ]]; then
  echo "ERROR: ASSET_PATH must be a single absolute URL path beginning with /." >&2
  exit 2
fi
if [[ ! "$REPEATS" =~ ^[1-9][0-9]*$ ]]; then
  echo "ERROR: REPEATS must be a positive integer." >&2
  exit 2
fi

API_HOST="$(node -e 'process.stdout.write(new URL(process.argv[1]).hostname)' "$API_BASE_URL")"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

probe() {
  local label="$1"
  local path="$2"
  local mode="$3"
  local iteration="$4"
  local headers="$TMP_DIR/headers"
  local body="$TMP_DIR/body"
  local -a connect_args=()

  if [[ "$mode" == "origin-bypass" ]]; then
    # Keeps URL host, Host header, and TLS SNI as API_HOST while connecting to Railway.
    connect_args=(--connect-to "$API_HOST:443:$RAILWAY_ORIGIN_HOST:443")
  fi

  local status
  status="$(curl --silent --show-error --location --max-time 30 \
    "${connect_args[@]}" \
    --dump-header "$headers" --output "$body" \
    --write-out '%{http_code}' "${API_BASE_URL%/}$path" || true)"

  local content_type cf_ray cf_cache server railway_id body_sample
  content_type="$(awk 'BEGIN{IGNORECASE=1} /^content-type:/ {sub(/^[^:]*:[[:space:]]*/, ""); sub(/\r$/, ""); v=$0} END{print v}' "$headers")"
  cf_ray="$(awk 'BEGIN{IGNORECASE=1} /^cf-ray:/ {sub(/^[^:]*:[[:space:]]*/, ""); sub(/\r$/, ""); v=$0} END{print v}' "$headers")"
  cf_cache="$(awk 'BEGIN{IGNORECASE=1} /^cf-cache-status:/ {sub(/^[^:]*:[[:space:]]*/, ""); sub(/\r$/, ""); v=$0} END{print v}' "$headers")"
  server="$(awk 'BEGIN{IGNORECASE=1} /^server:/ {sub(/^[^:]*:[[:space:]]*/, ""); sub(/\r$/, ""); v=$0} END{print v}' "$headers")"
  railway_id="$(awk 'BEGIN{IGNORECASE=1} /^x-railway-request-id:/ {sub(/^[^:]*:[[:space:]]*/, ""); sub(/\r$/, ""); v=$0} END{print v}' "$headers")"
  body_sample="$(head -c 160 "$body" 2>/dev/null | tr '\r\n' '  ' || true)"

  printf '\n[%s] run=%s mode=%s\n' "$label" "$iteration" "$mode"
  printf 'status=%s content-type=%s server=%s cf-ray=%s cf-cache-status=%s railway-request-id=%s\n' \
    "${status:-curl-error}" "${content_type:-<absent>}" "${server:-<absent>}" \
    "${cf_ray:-<absent>}" "${cf_cache:-<absent>}" "${railway_id:-<absent>}"
  printf 'body-prefix=%s\n' "${body_sample:-<empty>}"
}

echo "Read-only diagnostic; no DNS, Cloudflare, or application settings are changed."
echo "API host: $API_HOST"
echo "Origin connection target: $RAILWAY_ORIGIN_HOST"
echo "Known published asset: $ASSET_PATH"
echo "Repeats: $REPEATS"

for ((i=1; i<=REPEATS; i++)); do
  probe "published-asset" "$ASSET_PATH" "proxied" "$i"
  probe "published-asset" "$ASSET_PATH" "origin-bypass" "$i"
done

echo
echo "Negative control: expected application-level 404 for a nonexistent product asset."
probe "missing-asset" "$MISSING_PATH" "proxied" "1"
probe "missing-asset" "$MISSING_PATH" "origin-bypass" "1"

echo
echo "Interpretation:"
echo "- Proxied failures without x-railway-request-id, while origin-bypass succeeds, point toward the proxy path."
echo "- Matching 404s for the missing asset confirm the route is reachable; they do not prove all authorization cases."
echo "- A 502 with a Railway request ID should be correlated with Railway logs at the same timestamp."
