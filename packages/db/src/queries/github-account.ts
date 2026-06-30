import type { createDb } from "../index";
import { githubAccounts } from "../schema/github-account";

type Db = ReturnType<typeof createDb>;

/**
 * Shape of a fetched GitHub account, mirroring GithubAccount from
 * @github_info/api/github/client.  Defined locally to avoid a circular
 * dependency (packages/api depends on packages/db; importing api here
 * would create api → db → api cycle).
 */
type GithubAccountInput = {
	githubId: number;
	login: string;
	name: string | null;
	avatarUrl: string | null;
	email: string | null;
	company: string | null;
	blog: string | null;
	location: string | null;
	bio: string | null;
	publicRepos: number;
	followers: number;
	following: number;
	/** GitHub account creation ISO 8601 string — converted to Date before insert. */
	createdAt: string;
};

/**
 * Upsert a GitHub account record into the github_accounts table.
 *
 * - Inserts on first occurrence (keyed on github_id).
 * - On conflict with an existing github_id, updates all mutable fields.
 * - Converts the GitHub ISO-8601 createdAt string to a Date for
 *   github_created_at storage.
 * - Uses only Drizzle parameterized bindings; no raw SQL strings.
 *
 * @param db      Drizzle database instance (from createDb / db singleton).
 * @param account Fetched GitHub account data — token must NOT be included.
 * @returns       The persisted row.
 */
export async function upsertGithubAccount(
	db: Db,
	account: GithubAccountInput,
): Promise<typeof githubAccounts.$inferSelect> {
	const githubCreatedAt = new Date(account.createdAt);

	const [row] = await db
		.insert(githubAccounts)
		.values({
			id: crypto.randomUUID(),
			githubId: String(account.githubId),
			login: account.login,
			name: account.name,
			avatarUrl: account.avatarUrl,
			email: account.email,
			company: account.company,
			blog: account.blog,
			location: account.location,
			bio: account.bio,
			publicRepos: account.publicRepos,
			followers: account.followers,
			following: account.following,
			githubCreatedAt,
		})
		.onConflictDoUpdate({
			target: githubAccounts.githubId,
			set: {
				login: account.login,
				name: account.name,
				avatarUrl: account.avatarUrl,
				email: account.email,
				company: account.company,
				blog: account.blog,
				location: account.location,
				bio: account.bio,
				publicRepos: account.publicRepos,
				followers: account.followers,
				following: account.following,
				githubCreatedAt,
				updatedAt: new Date(),
			},
		})
		.returning();

	if (!row) {
		throw new Error(
			"upsertGithubAccount: insert .returning() returned no rows unexpectedly",
		);
	}

	return row;
}
