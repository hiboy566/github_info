build-GitHubInfoFunction:
	pnpm install --frozen-lockfile
	pnpm --filter server build
	cp apps/server/dist/*.mjs "$(ARTIFACTS_DIR)/"
