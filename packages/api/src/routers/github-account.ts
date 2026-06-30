import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { fetchGithubUser, GithubClientError } from "../github/client";
import { publicProcedure, router } from "../index";

const errorCodeMap = {
	"invalid-token": "UNAUTHORIZED",
	forbidden: "FORBIDDEN",
	"rate-limited": "TOO_MANY_REQUESTS",
	"upstream-error": "INTERNAL_SERVER_ERROR",
} as const satisfies Record<
	GithubClientError["code"],
	"UNAUTHORIZED" | "FORBIDDEN" | "TOO_MANY_REQUESTS" | "INTERNAL_SERVER_ERROR"
>;

export const githubAccountRouter = router({
	fetch: publicProcedure
		.input(z.object({ token: z.string().min(1, "Token 不能为空") }))
		.mutation(async ({ input }) => {
			try {
				return await fetchGithubUser(input.token);
			} catch (err) {
				if (err instanceof GithubClientError) {
					throw new TRPCError({
						code: errorCodeMap[err.code],
						// err.message is user-facing, crafted in client.ts without token
						message: err.message,
					});
				}
				// Unexpected non-domain error — no internal details leaked to client
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "请求失败，请稍后重试。",
				});
			}
		}),
});
