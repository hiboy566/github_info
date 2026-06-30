import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchGithubUser, GithubClientError } from "./client";

const mockGithubUserJson = {
	id: 12345,
	login: "testuser",
	name: "Test User",
	avatar_url: "https://avatars.githubusercontent.com/u/12345",
	email: "test@example.com",
	company: "Test Corp",
	blog: "https://test.com",
	location: "Test City",
	bio: "A test user",
	public_repos: 42,
	followers: 100,
	following: 50,
	created_at: "2020-01-01T00:00:00Z",
};

function makeFetchResponse(
	status: number,
	body: unknown,
	headers: Record<string, string> = {},
) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json", ...headers },
	});
}

describe("fetchGithubUser", () => {
	beforeEach(() => {
		vi.spyOn(globalThis, "fetch");
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("maps GitHub API response fields to GithubAccount", async () => {
		vi.mocked(fetch).mockResolvedValueOnce(
			makeFetchResponse(200, mockGithubUserJson),
		);

		const account = await fetchGithubUser("ghp_fake_token");

		expect(account.githubId).toBe(12345);
		expect(account.login).toBe("testuser");
		expect(account.name).toBe("Test User");
		expect(account.avatarUrl).toBe(
			"https://avatars.githubusercontent.com/u/12345",
		);
		expect(account.email).toBe("test@example.com");
		expect(account.publicRepos).toBe(42);
		expect(account.followers).toBe(100);
		expect(account.following).toBe(50);
		expect(account.createdAt).toBe("2020-01-01T00:00:00Z");
	});

	it("tolerates nullable fields from GitHub API", async () => {
		vi.mocked(fetch).mockResolvedValueOnce(
			makeFetchResponse(200, {
				...mockGithubUserJson,
				name: null,
				email: null,
				company: null,
				blog: null,
				location: null,
				bio: null,
				avatar_url: null,
			}),
		);

		const account = await fetchGithubUser("ghp_fake_token");

		expect(account.name).toBeNull();
		expect(account.email).toBeNull();
		expect(account.company).toBeNull();
		expect(account.bio).toBeNull();
		expect(account.avatarUrl).toBeNull();
	});

	it("throws GithubClientError(invalid-token) on HTTP 401", async () => {
		vi.mocked(fetch).mockResolvedValueOnce(
			makeFetchResponse(401, { message: "Bad credentials" }),
		);

		await expect(fetchGithubUser("ghp_bad_token")).rejects.toMatchObject({
			code: "invalid-token",
		});
	});

	it("throws GithubClientError(rate-limited) on HTTP 403 with x-ratelimit-remaining: 0", async () => {
		vi.mocked(fetch).mockResolvedValueOnce(
			makeFetchResponse(
				403,
				{ message: "Forbidden" },
				{ "x-ratelimit-remaining": "0" },
			),
		);

		await expect(fetchGithubUser("ghp_token")).rejects.toMatchObject({
			code: "rate-limited",
		});
	});

	it("throws GithubClientError(forbidden) on HTTP 403 without rate-limit exhaustion", async () => {
		vi.mocked(fetch).mockResolvedValueOnce(
			makeFetchResponse(403, { message: "Forbidden" }),
		);

		await expect(fetchGithubUser("ghp_token")).rejects.toMatchObject({
			code: "forbidden",
		});
	});

	it("throws GithubClientError(upstream-error) on unexpected non-OK status", async () => {
		vi.mocked(fetch).mockResolvedValueOnce(
			makeFetchResponse(500, { message: "Internal Server Error" }),
		);

		await expect(fetchGithubUser("ghp_token")).rejects.toMatchObject({
			code: "upstream-error",
		});
	});

	it("throws GithubClientError(upstream-error) on network failure", async () => {
		vi.mocked(fetch).mockRejectedValueOnce(new Error("Network Error"));

		await expect(fetchGithubUser("ghp_token")).rejects.toMatchObject({
			code: "upstream-error",
		});
	});

	it("throws GithubClientError(upstream-error) when response body is not valid JSON", async () => {
		vi.mocked(fetch).mockResolvedValueOnce(
			new Response("not-json", { status: 200 }),
		);

		await expect(fetchGithubUser("ghp_token")).rejects.toMatchObject({
			code: "upstream-error",
		});
	});

	it("throws GithubClientError(upstream-error) when response shape is unexpected", async () => {
		vi.mocked(fetch).mockResolvedValueOnce(
			makeFetchResponse(200, { unexpected: "shape" }),
		);

		await expect(fetchGithubUser("ghp_token")).rejects.toMatchObject({
			code: "upstream-error",
		});
	});

	it("does not include the token value in thrown error messages (AC-002 / AC-003)", async () => {
		const secretToken = "ghp_super_secret_token_value_abc123";
		vi.mocked(fetch).mockResolvedValueOnce(
			makeFetchResponse(401, { message: "Bad credentials" }),
		);

		let caughtError: unknown;
		try {
			await fetchGithubUser(secretToken);
		} catch (err) {
			caughtError = err;
		}

		expect(caughtError).toBeInstanceOf(GithubClientError);
		const error = caughtError as GithubClientError;
		expect(error.message).not.toContain(secretToken);
	});
});
