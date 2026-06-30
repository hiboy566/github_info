import { describe, expect, it } from "vitest";

import { githubAccounts } from "../schema/github-account";

/**
 * Static schema-structure tests.
 * No database connection is needed — these verify the Drizzle column
 * definitions at unit-test time, before any migration is applied.
 *
 * NOTE: this file lives in src/__tests__/ (NOT src/schema/) on purpose —
 * drizzle.config.ts globs `./src/schema`, so any *.ts there is loaded by
 * db:generate/db:migrate/db:push. A Vitest file in that dir would be
 * imported by drizzle-kit and break those commands.
 */
describe("github_accounts schema (T-001 / AC-003)", () => {
	it("exposes all required columns from F-001", () => {
		// Each column referenced here must exist in the schema definition.
		expect(githubAccounts.id).toBeDefined();
		expect(githubAccounts.githubId).toBeDefined();
		expect(githubAccounts.login).toBeDefined();
		expect(githubAccounts.name).toBeDefined();
		expect(githubAccounts.avatarUrl).toBeDefined();
		expect(githubAccounts.email).toBeDefined();
		expect(githubAccounts.company).toBeDefined();
		expect(githubAccounts.location).toBeDefined();
		expect(githubAccounts.bio).toBeDefined();
		expect(githubAccounts.twitterUsername).toBeDefined();
		expect(githubAccounts.publicRepos).toBeDefined();
		expect(githubAccounts.followers).toBeDefined();
		expect(githubAccounts.following).toBeDefined();
		expect(githubAccounts.githubCreatedAt).toBeDefined();
		expect(githubAccounts.createdAt).toBeDefined();
		expect(githubAccounts.updatedAt).toBeDefined();
	});

	it("does not expose any token-related column (AC-003)", () => {
		// Cast to a generic record to probe runtime property existence for
		// names that are intentionally absent from the TypeScript type.
		const schema = githubAccounts as unknown as Record<string, unknown>;
		expect(schema["token"]).toBeUndefined();
		expect(schema["accessToken"]).toBeUndefined();
		expect(schema["pat"]).toBeUndefined();
		expect(schema["personalAccessToken"]).toBeUndefined();
		expect(schema["githubToken"]).toBeUndefined();
	});

	it("githubId column has a unique constraint (AC-002 structural)", () => {
		// Drizzle column objects expose `isUnique` as an own property after
		// `.unique()` is called in the schema definition.
		const col = githubAccounts.githubId as unknown as Record<string, unknown>;
		expect(col["isUnique"]).toBe(true);
	});
});
