import type { GithubAccount } from "@github_info/api/github/client";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { AccountCard } from "@/components/github/account-card";
import TokenForm from "@/components/github/token-form";

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
	const [account, setAccount] = useState<GithubAccount | null>(null);

	return (
		<main className="mx-auto w-full max-w-[800px] px-6 py-8">
			{/* Title area */}
			<h1
				className="mb-8 font-bold text-3xl text-[#0F172A] tracking-tight"
				style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
			>
				GitHub Account Fetcher
			</h1>

			{/* Token input area — raised surface per DESIGN.md */}
			<section className="rounded-lg border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_16px_0_rgba(15,23,42,0.07)]">
				<TokenForm
					onSuccess={setAccount}
					onBeforeSubmit={() => setAccount(null)}
				/>
			</section>

			{/* Account information display area */}
			{account !== null && <AccountCard account={account} className="mt-8" />}
		</main>
	);
}
