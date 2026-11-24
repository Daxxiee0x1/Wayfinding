#!/usr/bin/env bash
# Build for the /Wayfinding/ subpath and publish dist/ to the gh-pages branch.
set -euo pipefail

cd "$(dirname "$0")/.."
REMOTE_URL="$(git remote get-url origin)"
REPO_NAME="$(basename -s .git "$REMOTE_URL")"

pnpm install --frozen-lockfile
BASE_PATH="/${REPO_NAME}/" pnpm run build
touch dist/.nojekyll

cd dist
git init -q -b gh-pages
git add -A
git commit -qm "Deploy $(git -C .. rev-parse --short HEAD)"
git push -f "$REMOTE_URL" gh-pages
rm -rf .git
