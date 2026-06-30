import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { type GithubAccount, GithubClientError } from "../github/client";

// vi.mock is hoisted: the factory runs before any import in this file, so
// all subsequent imports of "../github/client" receive the mocked version.
vi.mock("../github/client", async (importOriginal) => {
	const original = await importOriginal<typeof import("../github/client")>();
	return {
		...original,
		fetchGithubUser: vi.fn(),
	};
});

// Prevent the db singleton from attempting a real database connection in tests.
vi.mock("@github_info/db", () => ({
	db: {},
}));

// Mock the upsert helper; tests control per-call outcomes with
// mockResolvedValueOnce / mockRejectedValueOnce.
vi.mock("@github_info/db/queries/github-account", () => ({
	upsertGithubAccount: vi.fn(),
}));

// These imports are resolved after the mocks are applied.
import { upsertGithubAccount } from "@github_info/db/queries/github-account";
import { fetchGithubUser } from "../github/client";
import { appRouter } from "./index";

const mockFetchGithubUser = vi.mocked(fetchGithubUser);
const mockUpsertGithubAccount = vi.mocked(upsertGithubAccount);

const mockAccount: GithubAccount = {
	githubId: 99999,
	login: "octocat",
	name: "The Octocat",
	avatarUrl: "https://github.com/images/error/octocat_happy.gif",
	email: null,
	company: null,
	blog: null,
	location: null,
	bio: null,
	publicRepos: 8,
	followers: 9000,
	following: 9,
	createdAt: "2011-01-25T18:44:36Z",
};

describe("githubAccount.fetch tRPC procedure", () => {
	// publicProcedure does not inspect session; pass minimal context.
	// biome-ignore lint/suspicious/noExplicitAny: test-only context stub
	const caller = appRouter.createCaller({ auth: null, session: null } as any);

	beforeEach(() => {
		vi.clearAllMocks();
		// Default: upsert resolves successfully so tests that do not override it
		// get the happy-path behaviour without extra setup.
		mockUpsertGithubAccount.mockResolvedValue(undefined as never);
	});

	it("returns { account, saved: true } on successful fetch and save (AC-001)", async () => {
		mockFetchGithubUser.mockResolvedValueOnce(mockAccount);

		const result = await caller.githubAccount.fetch({ token: "ghp_valid" });

		expect(result).toEqual({ account: mockAccount, saved: true });
		expect(mockFetchGithubUser).toHaveBeenCalledWith("ghp_valid");
		expect(mockUpsertGithubAccount).toHaveBeenCalledOnce();
	});

	it("returns { account, saved: false } when upsert fails — save does not block response (F-004)", async () => {
		mockFetchGithubUser.mockResolvedValueOnce(mockAccount);
		mockUpsertGithubAccount.mockRejectedValueOnce(
			new Error("DB connection failed"),
		);

		const result = await caller.githubAccount.fetch({ token: "ghp_valid" });

		expect(result).toEqual({ account: mockAccount, saved: false });
		expect(mockFetchGithubUser).toHaveBeenCalledWith("ghp_valid");
		expect(mockUpsertGithubAccount).toHaveBeenCalledOnce();
	});

	it("propagates the token to fetchGithubUser without modification", async () => {
		const token = "ghp_test_token_abc";
		mockFetchGithubUser.mockResolvedValueOnce(mockAccount);

		await caller.githubAccount.fetch({ token });

		expect(mockFetchGithubUser).toHaveBeenCalledOnce();
		expect(mockFetchGithubUser).toHaveBeenCalledWith(token);
	});

	it("maps invalid-token → UNAUTHORIZED TRPCError (AC-002)", async () => {
		mockFetchGithubUser.mockRejectedValueOnce(
			new GithubClientError("invalid-token", "Token is invalid or expired."),
		);

		await expect(
			caller.githubAccount.fetch({ token: "ghp_bad" }),
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
	});

	it("maps forbidden → FORBIDDEN TRPCError", async () => {
		mockFetchGithubUser.mockRejectedValueOnce(
			new GithubClientError("forbidden", "Token lacks required permissions."),
		);

		await expect(
			caller.githubAccount.fetch({ token: "ghp_noscope" }),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	it("maps rate-limited → TOO_MANY_REQUESTS TRPCError", async () => {
		mockFetchGithubUser.mockRejectedValueOnce(
			new GithubClientError("rate-limited", "GitHub API rate limit exceeded."),
		);

		await expect(
			caller.githubAccount.fetch({ token: "ghp_token" }),
		).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
	});

	it("maps upstream-error → INTERNAL_SERVER_ERROR TRPCError", async () => {
		mockFetchGithubUser.mockRejectedValueOnce(
			new GithubClientError("upstream-error", "GitHub API unavailable."),
		);

		await expect(
			caller.githubAccount.fetch({ token: "ghp_token" }),
		).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
	});

	it("rejects empty token with BAD_REQUEST via zod (AC-004)", async () => {
		await expect(
			caller.githubAccount.fetch({ token: "" }),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
	});

	it("handles non-Error upsert rejection gracefully — saved=false, no crash (branch AC-004)", async () => {
		mockFetchGithubUser.mockResolvedValueOnce(mockAccount);
		// Reject with a plain string to exercise the `"unknown error"` branch
		// inside the catch block (line 52: err instanceof Error ? err.message : "unknown error")
		mockUpsertGithubAccount.mockRejectedValueOnce("plain string rejection");

		const result = await caller.githubAccount.fetch({ token: "ghp_valid" });

		expect(result).toEqual({ account: mockAccount, saved: false });
	});

	it("wraps unexpected non-domain errors as INTERNAL_SERVER_ERROR", async () => {
		mockFetchGithubUser.mockRejectedValueOnce(
			new TypeError("Something completely unexpected"),
		);

		await expect(
			caller.githubAccount.fetch({ token: "ghp_token" }),
		).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
	});

	it("does not include the token in TRPCError message (AC-003)", async () => {
		const secretToken = "ghp_super_secret_token_should_not_appear_12345";
		mockFetchGithubUser.mockRejectedValueOnce(
			new GithubClientError("invalid-token", "Token is invalid or expired."),
		);

		let thrownError: unknown;
		try {
			await caller.githubAccount.fetch({ token: secretToken });
		} catch (err) {
			thrownError = err;
		}

		expect(thrownError).toBeInstanceOf(TRPCError);
		const error = thrownError as TRPCError;
		expect(error.message).not.toContain(secretToken);
		expect(error.message).not.toContain("ghp_");
	});
});
