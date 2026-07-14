import { Button } from "@github_info/ui/components/button";
import { Input } from "@github_info/ui/components/input";
import { Label } from "@github_info/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import z from "zod";

import type { GithubAccount } from "@/lib/api";
import { fetchGithubAccount, getErrorMessage } from "@/lib/api";

export interface TokenFormProps {
	/** Called with the fetched account after a successful mutation. */
	onSuccess: (account: GithubAccount, saved: boolean) => void;
	/** Called just before a new fetch starts so the parent can clear stale state. */
	onBeforeSubmit?: () => void;
}

const tokenSchema = z.object({
	token: z.string().trim().min(1, "请输入 Token").max(1024, "Token 长度不合法"),
});

/**
 * GitHub Personal Access Token input form.
 *
 * Security invariants (security.md):
 *  - Input is always type="password" to mask the token.
 *  - Token is never written to localStorage or any persistent storage.
 *  - The mutation receives no variables, so the token is never retained in
 *    TanStack Query's mutation cache. A ref holds it only for the request.
 */
export default function TokenForm({
	onSuccess,
	onBeforeSubmit,
}: TokenFormProps) {
	const tokenRef = useRef("");
	const mutation = useMutation({
		mutationFn: () => fetchGithubAccount(tokenRef.current),
		gcTime: 0,
		onSettled: () => {
			tokenRef.current = "";
		},
	});

	const form = useForm({
		defaultValues: {
			token: "",
		},
		onSubmit: ({ value }) => {
			// Notify parent so it can clear any stale account state.
			onBeforeSubmit?.();
			// Reset any previous mutation state before a new attempt.
			mutation.reset();
			tokenRef.current = value.token.trim();
			// Clear the visible field before the request leaves the browser. The
			// short-lived ref is wiped in the mutation's onSettled callback.
			form.reset();
			mutation.mutate(undefined, {
				onSuccess: ({ account, saved }) => {
					if (saved) {
						toast.success("已保存");
					} else {
						toast.warning("账户信息获取成功，但保存失败");
					}
					// Pass only the account up to the parent; saved state is
					// surfaced via toast and must not block AccountCard display.
					onSuccess(account, saved);
				},
			});
		},
		validators: {
			onSubmit: tokenSchema,
		},
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				// Guard against keyboard-triggered re-submission while a request is in flight.
				if (!mutation.isPending) {
					void form.handleSubmit();
				}
			}}
			className="space-y-4"
		>
			<form.Field name="token">
				{(field) => (
					<div className="space-y-2">
						<Label htmlFor={field.name}>GitHub Personal Access Token</Label>
						<Input
							id={field.name}
							name={field.name}
							type="password"
							placeholder="ghp_xxxxxxxxxxxx"
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(e) => field.handleChange(e.target.value)}
						/>
						{field.state.meta.errors.map((error) => (
							<p key={error?.message} className="text-red-500 text-sm">
								{error?.message}
							</p>
						))}
					</div>
				)}
			</form.Field>

			{mutation.isError && (
				<p role="alert" className="text-red-500 text-sm">
					{getErrorMessage(mutation.error)}
				</p>
			)}

			<form.Subscribe
				selector={(state) => ({
					canSubmit: state.canSubmit,
					isSubmitting: state.isSubmitting,
				})}
			>
				{({ canSubmit, isSubmitting }) => (
					<Button
						type="submit"
						className="w-full"
						disabled={!canSubmit || isSubmitting || mutation.isPending}
					>
						{mutation.isPending ? (
							<>
								<Loader2 className="animate-spin" />
								获取中…
							</>
						) : (
							"获取账户信息"
						)}
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}
