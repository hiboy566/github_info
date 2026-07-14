import { env } from "@github_info/env/web";

/** Account shape returned by the Go server — mirrors the old tRPC payload. */
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

export type FetchAccountResult = {
	account: GithubAccount;
	saved: boolean;
};

export type StoredAccountResult = {
	account: GithubAccount;
	updatedAt: string;
};

/** Error thrown by the REST client; `code` mirrors the Go server error codes. */
export class ApiError extends Error {
	readonly code: string;
	readonly status: number;

	constructor(code: string, status: number, message: string) {
		super(message);
		this.name = "ApiError";
		this.code = code;
		this.status = status;
	}
}

type ErrorBody = { error?: { code?: string; message?: string } };

const apiBaseUrl = env.VITE_SERVER_URL.replace(/\/+$/, "");
const requestTimeoutMs = 20_000;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
	let response: Response;
	try {
		response = await fetch(`${apiBaseUrl}${path}`, {
			...init,
			signal: init?.signal ?? AbortSignal.timeout(requestTimeoutMs),
		});
	} catch {
		throw new ApiError(
			"NETWORK_ERROR",
			0,
			"无法连接服务器，请确认后端已启动。",
		);
	}

	if (!response.ok) {
		let body: ErrorBody | null = null;
		try {
			body = (await response.json()) as ErrorBody;
		} catch {
			// Non-JSON error body — fall through to the generic message.
		}
		throw new ApiError(
			body?.error?.code ?? "INTERNAL_SERVER_ERROR",
			response.status,
			body?.error?.message ?? "请求失败，请稍后重试",
		);
	}

	return (await response.json()) as T;
}

/** POST /api/github-account/fetch — validate the PAT, fetch and persist. */
export function fetchGithubAccount(token: string): Promise<FetchAccountResult> {
	return request<FetchAccountResult>("/api/github-account/fetch", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ token }),
	});
}

/** GET /api/intro/:login — read the stored personal profile by username. */
export function getPersonalIntro(login: string): Promise<StoredAccountResult> {
	return request<StoredAccountResult>(
		`/api/intro/${encodeURIComponent(login)}`,
	);
}

/**
 * Map an API error to a user-facing Chinese message (PRD §8).
 * Never surfaces the token or internal error detail.
 */
export function getErrorMessage(error: unknown): string {
	if (error instanceof ApiError) {
		switch (error.code) {
			case "UNAUTHORIZED":
				return "Token 不正确或已失效";
			case "FORBIDDEN":
				return "Token 权限不足";
			case "TOO_MANY_REQUESTS":
				return "GitHub 限流，请稍后重试";
			case "NOT_FOUND":
				return "还没有这个用户名的个人信息记录，请先在首页获取一次账户信息";
			case "NETWORK_ERROR":
				return "无法连接服务器，请确认后端已启动";
			default:
				return "请求失败，请稍后重试";
		}
	}
	return "请求失败，请稍后重试";
}
