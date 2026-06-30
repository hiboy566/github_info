import { z } from "zod";

/**
 * Zod schema for GitHub /user API response.
 * Only picks fields needed for GithubAccount; tolerates extra fields.
 * Fields that GitHub may omit or return as null are marked nullable.
 */
const githubUserSchema = z.object({
	id: z.number(),
	login: z.string(),
	name: z.string().nullable(),
	avatar_url: z.string().nullable(),
	email: z.string().nullable(),
	company: z.string().nullable(),
	location: z.string().nullable(),
	bio: z.string().nullable(),
	twitter_username: z.string().nullable(),
	public_repos: z.number(),
	followers: z.number(),
	following: z.number(),
	created_at: z.string(),
});

export type GithubAccount = {
	githubId: number;
	login: string;
	name: string | null;
	avatarUrl: string | null;
	email: string | null;
	company: string | null;
	location: string | null;
	bio: string | null;
	twitterUsername: string | null;
	publicRepos: number;
	followers: number;
	following: number;
	createdAt: string;
};

/**
 * Domain error codes produced by the GitHub client.
 * These are converted to TRPCError codes by the procedure layer.
 */
export type GithubClientErrorCode =
	| "invalid-token"
	| "rate-limited"
	| "forbidden"
	| "upstream-error";

export class GithubClientError extends Error {
	readonly code: GithubClientErrorCode;

	constructor(code: GithubClientErrorCode, message: string) {
		super(message);
		this.name = "GithubClientError";
		this.code = code;
	}
}

/** Outbound request timeout (ms) — bounds a slow/unresponsive GitHub endpoint. */
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Fetch the authenticated GitHub user using the provided Personal Access Token.
 *
 * Security invariants:
 * - The token is NEVER logged or included in thrown error messages.
 * - Only called server-side; not exported for client-side use.
 *
 * @throws {GithubClientError} With a domain error code describing the failure.
 */
export async function fetchGithubUser(token: string): Promise<GithubAccount> {
	let response: Response;

	try {
		response = await fetch("https://api.github.com/user", {
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: "application/vnd.github+json",
				"User-Agent": "github_info-app",
				"X-GitHub-Api-Version": "2022-11-28",
			},
			// Abort a hung connection so the handler can't stall indefinitely (CWE-400).
			// The resulting AbortError is caught below and reclassified as upstream-error.
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
		});
	} catch {
		// Network or timeout — do not include token in error
		throw new GithubClientError(
			"upstream-error",
			"Failed to reach GitHub API. Please check your network connection.",
		);
	}

	if (response.status === 401) {
		throw new GithubClientError(
			"invalid-token",
			"The provided token is invalid or has expired.",
		);
	}

	if (response.status === 403) {
		const remaining = response.headers.get("x-ratelimit-remaining");
		if (remaining === "0") {
			throw new GithubClientError(
				"rate-limited",
				"GitHub API rate limit exceeded. Please try again later.",
			);
		}
		throw new GithubClientError(
			"forbidden",
			"The token does not have sufficient permissions.",
		);
	}

	if (!response.ok) {
		throw new GithubClientError(
			"upstream-error",
			`GitHub API returned an unexpected status: ${response.status.toString()}.`,
		);
	}

	let raw: unknown;
	try {
		raw = await response.json();
	} catch {
		throw new GithubClientError(
			"upstream-error",
			"GitHub API returned an unreadable response.",
		);
	}

	const parsed = githubUserSchema.safeParse(raw);
	if (!parsed.success) {
		throw new GithubClientError(
			"upstream-error",
			"GitHub API response did not match the expected shape.",
		);
	}

	const data = parsed.data;
	return {
		githubId: data.id,
		login: data.login,
		name: data.name,
		avatarUrl: data.avatar_url,
		email: data.email,
		company: data.company,
		location: data.location,
		bio: data.bio,
		twitterUsername: data.twitter_username,
		publicRepos: data.public_repos,
		followers: data.followers,
		following: data.following,
		createdAt: data.created_at,
	};
}
