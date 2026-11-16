#!/usr/bin/env bash
# The end-to-end tests inside Playwright's official Linux image, at the version package.json pins: the
# reference environment for exact pixel checks. CI runs this same script, so a run on any machine with
# Docker (Docker Desktop on a Mac) draws exactly what CI draws.
#
#   tooling/e2e-docker.sh                       every browser (Chromium, Firefox, WebKit)
#   tooling/e2e-docker.sh --project=chromium    arguments go to Playwright
#
# The amd64 image is used everywhere (emulated on Apple silicon, so slower there), because a different
# processor can rasterise a few pixels differently. Inside it, Node is the version .nvmrc pins, checked
# against nodejs.org's published checksums; the repository is copied in without the host's node_modules,
# so nothing built for the host runs in Linux. Failed tests' images land in packages/web/test-results-docker.
#
# Behind a proxy that inspects HTTPS (some company networks), set E2E_DOCKER_CA to its CA bundle on the
# host; the container then trusts it for downloading Node and packages. Proxy variables pass through.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Keep the tag in step with "@playwright/test" in package.json (tooling/repository-text.test.ts checks it).
image="mcr.microsoft.com/playwright:v1.65.0-noble@sha256:9beb546099e11f52d62e505537914870e01a67e0e6b00ae41da4775324e73dbe"
node_version="$(tr -d '[:space:]' < "$root/.nvmrc")"
results="$root/packages/web/test-results-docker"
mkdir -p "$results"

extra=()
if [ -n "${E2E_DOCKER_CA:-}" ]; then
  extra=(-v "$E2E_DOCKER_CA:/etc/e2e-ca.crt:ro" -e CURL_CA_BUNDLE=/etc/e2e-ca.crt -e NODE_EXTRA_CA_CERTS=/etc/e2e-ca.crt -e npm_config_cafile=/etc/e2e-ca.crt)
fi

docker run --rm --init --ipc=host --platform linux/amd64 \
  -e CI=true -e PIXEL_REFERENCE=1 -e NODE_VERSION="$node_version" \
  -e HTTPS_PROXY -e HTTP_PROXY -e NO_PROXY -e https_proxy -e http_proxy -e no_proxy \
  ${extra[@]+"${extra[@]}"} \
  -v "$root:/src:ro" -v "$results:/results" \
  "$image" bash -euo pipefail -c '
    node_dist="node-v$NODE_VERSION-linux-x64"
    cd /tmp
    curl -fsSLO "https://nodejs.org/dist/v$NODE_VERSION/$node_dist.tar.gz"
    curl -fsSL "https://nodejs.org/dist/v$NODE_VERSION/SHASUMS256.txt" | grep " $node_dist.tar.gz\$" | sha256sum -c -
    tar -xzf "$node_dist.tar.gz" -C /opt
    export PATH="/opt/$node_dist/bin:$PATH"
    mkdir /work
    tar -C /src --exclude=node_modules --exclude=.git --exclude=dist --exclude=test-results --exclude=test-results-docker --exclude=.wrangler -cf - . | tar -C /work -xf -
    cd /work
    npm ci --ignore-scripts --no-audit --no-fund
    npm run test:e2e -w @stopwatch/web -- --output=/results "$@"
  ' e2e ${@+"$@"}
