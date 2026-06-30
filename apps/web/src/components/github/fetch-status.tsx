/** Structural type covering both TRPCClientError and TRPCClientErrorLike shapes. */
type AnyTrpcError = { data?: { code?: string } | null };

/**
 * Map a githubAccount.fetch tRPC error to a user-facing Chinese message (PRD §8).
 * Never surfaces the token or internal error detail.
 */
export function getErrorMessage(error: AnyTrpcError): string {
	const code = error.data?.code;
	switch (code) {
		case "UNAUTHORIZED":
			return "Token 不正确或已失效";
		case "FORBIDDEN":
			return "Token 权限不足";
		case "TOO_MANY_REQUESTS":
			return "GitHub 限流，请稍后重试";
		default:
			return "请求失败，请稍后重试";
	}
}
