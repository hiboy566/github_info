import { describe, expect, it, vi } from "vitest";
import { githubAccounts } from "../schema/github-account";
import { upsertGithubAccount } from "./github-account";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const sampleAccount = {
	githubId: 12345,
	login: "testuser",
	name: "Test User",
	avatarUrl: "https://avatars.github.com/u/12345",
	email: "test@example.com",
	company: "Test Corp",
	blog: "https://blog.test.com",
	location: "Test City",
	bio: "A test user",
	publicRepos: 42,
	followers: 100,
	following: 50,
	createdAt: "2020-01-01T00:00:00Z",
};

const sampleRow = {
	id: "test-uuid-1",
	githubId: "12345",
	login: "testuser",
	name: "Test User",
	avatarUrl: "https://avatars.github.com/u/12345",
	email: "test@example.com",
	company: "Test Corp",
	blog: "https://blog.test.com",
	location: "Test City",
	bio: "A test user",
	publicRepos: 42,
	followers: 100,
	following: 50,
	githubCreatedAt: new Date("2020-01-01T00:00:00Z"),
	createdAt: new Date("2026-01-01T00:00:00Z"),
	updatedAt: new Date("2026-01-01T00:00:00Z"),
};

// ---------------------------------------------------------------------------
// Mock factory
// The Drizzle chain for insert is:
//   db.insert(table).values(data).onConflictDoUpdate(opts).returning()
// ---------------------------------------------------------------------------

function makeDbMock(returnedRows: unknown[]) {
	const returning = vi.fn().mockResolvedValue(returnedRows);
	const onConflictDoUpdate = vi.fn(() => ({ returning }));
	const values = vi.fn(() => ({ onConflictDoUpdate }));
	const insert = vi.fn(() => ({ values }));
	// biome-ignore lint/suspicious/noExplicitAny: mock db — not a real Drizzle instance
	return { db: { insert } as any, insert, values, onConflictDoUpdate, returning };
}

// ---------------------------------------------------------------------------
// Helper to read `.values()` call args without fighting noUncheckedIndexedAccess
// ---------------------------------------------------------------------------
// biome-ignore lint/suspicious/noExplicitAny: needed to access mock call args
function firstCallArg(mock: ReturnType<typeof vi.fn>): Record<string, any> {
	// biome-ignore lint/suspicious/noExplicitAny: mock type is any[][]
	return (mock.mock.calls as any)[0][0] as Record<string, any>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("upsertGithubAccount (T-002)", () => {
	it("resolves to the persisted row on success (AC-001)", async () => {
		const { db, returning } = makeDbMock([sampleRow]);

		const result = await upsertGithubAccount(db, sampleAccount);

		expect(result).toStrictEqual(sampleRow);
		expect(returning).toHaveBeenCalledOnce();
	});

	it("converts githubId from number to string before insert", async () => {
		const { db, values } = makeDbMock([sampleRow]);

		await upsertGithubAccount(db, { ...sampleAccount, githubId: 99999 });

		const insertedValues = firstCallArg(values);
		expect(insertedValues["githubId"]).toBe("99999");
		expect(typeof insertedValues["githubId"]).toBe("string");
	});

	it("converts the ISO 8601 createdAt string to a Date for githubCreatedAt (F-001)", async () => {
		const { db, values } = makeDbMock([sampleRow]);
		const iso = "2021-09-15T08:00:00Z";

		await upsertGithubAccount(db, { ...sampleAccount, createdAt: iso });

		const insertedValues = firstCallArg(values);
		expect(insertedValues["githubCreatedAt"]).toBeInstanceOf(Date);
		expect((insertedValues["githubCreatedAt"] as Date).toISOString()).toBe(
			new Date(iso).toISOString(),
		);
	});

	it("does not pass any token-related field to the database (AC-003)", async () => {
		const { db, values } = makeDbMock([sampleRow]);

		await upsertGithubAccount(db, sampleAccount);

		const insertedValues = firstCallArg(values);
		expect(insertedValues["token"]).toBeUndefined();
		expect(insertedValues["accessToken"]).toBeUndefined();
		expect(insertedValues["pat"]).toBeUndefined();
		expect(insertedValues["personalAccessToken"]).toBeUndefined();
	});

	it("uses onConflictDoUpdate targeting githubId for upsert semantics (AC-002)", async () => {
		const { db, onConflictDoUpdate } = makeDbMock([sampleRow]);

		await upsertGithubAccount(db, sampleAccount);

		expect(onConflictDoUpdate).toHaveBeenCalledOnce();
		const conflictOpts = firstCallArg(onConflictDoUpdate);
		// The target must be the githubId column so Drizzle generates
		// ON CONFLICT (github_id) DO UPDATE — not a raw string.
		expect(conflictOpts["target"]).toBe(githubAccounts.githubId);
	});

	it("includes a fresh updatedAt Date in the conflict update set (AC-002)", async () => {
		const { db, onConflictDoUpdate } = makeDbMock([sampleRow]);
		const before = Date.now();

		await upsertGithubAccount(db, sampleAccount);

		const after = Date.now();
		const conflictOpts = firstCallArg(onConflictDoUpdate);
		const updatedAt = conflictOpts["set"]["updatedAt"] as Date;
		expect(updatedAt).toBeInstanceOf(Date);
		expect(updatedAt.getTime()).toBeGreaterThanOrEqual(before);
		expect(updatedAt.getTime()).toBeLessThanOrEqual(after);
	});

	it("throws a descriptive error when .returning() yields no rows (defensive guard)", async () => {
		const { db } = makeDbMock([]); // empty result simulates a bug in the DB driver

		await expect(upsertGithubAccount(db, sampleAccount)).rejects.toThrow(
			"upsertGithubAccount: insert .returning() returned no rows unexpectedly",
		);
	});
});
