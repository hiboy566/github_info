import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useState } from "react";

import { AccountCard } from "@/components/github/account-card";
import TokenForm from "@/components/github/token-form";
import type { FetchAccountResult } from "@/lib/api";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

/**
 * GitHub Account Fetcher page (public route, not under _auth).
 *
 * Layout (ui/DESIGN.md — Clinical Precision):
 *  1. Title area          — Plus Jakarta Sans headline, Navy (#0F172A)
 *  2. Token input section — raised surface card (white + clinical shadow)
 *  3. Info display section — AccountCard shown after a successful fetch
 *
 * State is held here and threaded down to child components:
 *  • account  → AccountCard (shown only after a successful fetch)
 *  • TokenForm manages mutation pending/error display inline; onBeforeSubmit
 *    clears the stale account card before each new request starts.
 */
function HomeComponent() {
	const [result, setResult] = useState<FetchAccountResult | null>(null);

	return (
		<main className="mx-auto w-full max-w-[800px] px-4 py-6 sm:px-6 sm:py-8">
			{/* Title area */}
			<h1
				className="mb-8 font-bold text-2xl text-[#0F172A] sm:text-3xl"
				style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
			>
				GitHub Account Fetcher
			</h1>

			{/* Token input area — raised surface per DESIGN.md */}
			<section className="rounded-lg border border-[#E2E8F0] bg-white p-4 shadow-[0_4px_16px_0_rgba(15,23,42,0.07)] sm:p-6">
				<TokenForm
					onSuccess={(account, saved) => setResult({ account, saved })}
					onBeforeSubmit={() => setResult(null)}
				/>
			</section>

			{/* Account information display area */}
			{result !== null && (
				<>
					<AccountCard account={result.account} className="mt-8" />

					{result.saved && (
						<Link
							to="/intro/$login"
							params={{ login: result.account.login }}
							className="mt-6 flex items-center justify-between gap-4 rounded-lg border border-[#E2E8F0] bg-white px-4 py-4 shadow-[0_4px_16px_0_rgba(15,23,42,0.07)] transition-colors hover:border-[#069669] sm:px-6"
						>
							<span className="min-w-0 break-words font-medium text-[#0F172A] text-sm">
								用我的用户名 @{result.account.login} 生成个人介绍页
							</span>
							<ArrowRight className="h-4 w-4 shrink-0 text-[#069669]" />
						</Link>
					)}
				</>
			)}
		</main>
	);
}
