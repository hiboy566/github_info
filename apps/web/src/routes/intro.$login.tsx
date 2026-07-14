import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowLeft,
	AtSign,
	Building2,
	CalendarDays,
	Mail,
	MapPin,
} from "lucide-react";

import Loader from "@/components/loader";
import type { GithubAccount } from "@/lib/api";
import { getErrorMessage, getPersonalIntro } from "@/lib/api";

export const Route = createFileRoute("/intro/$login")({
	component: IntroPage,
});

/** Assemble a short Chinese self-introduction from the stored account fields. */
function buildIntroParagraph(account: GithubAccount): string {
	const displayName = account.name ?? account.login;
	const joinYear = account.createdAt
		? new Date(account.createdAt).getFullYear()
		: Number.NaN;
	const sentences: string[] = [];

	let opening = `大家好，我是 ${displayName}（@${account.login}）`;
	if (account.location) {
		opening += `，来自 ${account.location}`;
	}
	sentences.push(`${opening}。`);

	if (account.company) {
		sentences.push(`目前就职于 ${account.company}。`);
	}

	const joinedText = Number.isNaN(joinYear)
		? ""
		: `我从 ${joinYear} 年开始使用 GitHub，`;
	sentences.push(
		`${joinedText}公开了 ${account.publicRepos} 个仓库，收获了 ${account.followers} 位关注者，也在关注 ${account.following} 位开发者。`,
	);

	if (account.email) {
		sentences.push(`欢迎通过 ${account.email} 与我交流。`);
	}

	return sentences.join("");
}

/**
 * Personal introduction page (public route) — the "generate an intro page
 * from my username" feature. Reads the account saved in PostgreSQL by the
 * Go server (GET /api/intro/:login) and renders it in the
 * Clinical Precision style (ui/DESIGN.md).
 */
function IntroPage() {
	const { login } = Route.useParams();
	const accountQuery = useQuery({
		queryKey: ["personal-intro", login],
		queryFn: () => getPersonalIntro(login),
		retry: false,
	});

	if (accountQuery.isPending) {
		return <Loader />;
	}

	if (accountQuery.isError) {
		return (
			<main className="mx-auto w-full max-w-[800px] px-4 py-6 sm:px-6 sm:py-8">
				<section className="rounded-lg border border-[#E2E8F0] bg-white p-5 text-center shadow-[0_4px_16px_0_rgba(15,23,42,0.07)] sm:p-8">
					<p className="font-semibold text-[#0F172A] text-lg">
						无法生成 @{login} 的个人介绍
					</p>
					<p className="mt-2 text-[#64748B] text-sm">
						{getErrorMessage(accountQuery.error)}
					</p>
					<Link
						to="/"
						className="mt-6 inline-flex items-center gap-2 rounded border border-[#E2E8F0] px-4 py-2 font-medium text-[#0F172A] text-sm transition-colors hover:border-[#069669]"
					>
						<ArrowLeft className="h-4 w-4" />
						回首页获取账户信息
					</Link>
				</section>
			</main>
		);
	}

	const { account, updatedAt } = accountQuery.data;
	const displayName = account.name ?? account.login;
	const memberSince = account.createdAt
		? new Date(account.createdAt).toLocaleDateString("zh-CN", {
				year: "numeric",
				month: "long",
			})
		: null;
	const updatedAtText = new Date(updatedAt).toLocaleString("zh-CN");

	const stats = [
		{ label: "Public Repos", value: account.publicRepos },
		{ label: "Followers", value: account.followers },
		{ label: "Following", value: account.following },
	];

	return (
		<main className="mx-auto w-full max-w-[800px] px-4 py-6 sm:px-6 sm:py-8">
			<section className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white shadow-[0_4px_16px_0_rgba(15,23,42,0.07)]">
				{/* Hero — navy surface with avatar and identity */}
				<div className="bg-[#0F172A] px-5 py-8 sm:px-8 sm:py-10">
					<div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-6">
						{account.avatarUrl && (
							<img
								src={account.avatarUrl}
								alt={`${account.login}'s avatar`}
								className="h-20 w-20 shrink-0 rounded-full border-2 border-white/20 object-cover sm:h-24 sm:w-24"
							/>
						)}
						<div className="min-w-0">
							<h1
								className="break-words font-bold text-2xl text-white sm:text-3xl"
								style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
							>
								{displayName}
							</h1>
							<p className="mt-1 break-all text-[#94A3B8] text-sm">
								@{account.login}
							</p>
							{account.bio && (
								<p className="mt-3 max-w-[480px] text-sm text-white/80 leading-relaxed">
									{account.bio}
								</p>
							)}
						</div>
					</div>
				</div>

				{/* Generated introduction paragraph */}
				<div className="px-5 py-6 sm:px-8">
					<p className="mb-2 font-medium text-[#64748B] text-xs uppercase tracking-[0.05em]">
						个人介绍
					</p>
					<p className="text-[#191c1e] text-[15px] leading-relaxed">
						{buildIntroParagraph(account)}
					</p>
				</div>

				{/* Stats row */}
				<div className="grid grid-cols-1 gap-3 px-5 pb-6 sm:grid-cols-3 sm:px-8">
					{stats.map((stat) => (
						<div
							key={stat.label}
							className="rounded border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-center"
						>
							<p className="font-semibold text-[#0F172A] text-xl tabular-nums">
								{stat.value}
							</p>
							<p className="mt-0.5 font-medium text-[#64748B] text-xs uppercase tracking-[0.05em]">
								{stat.label}
							</p>
						</div>
					))}
				</div>

				{/* Meta fields — omitted when null */}
				<ul className="space-y-2.5 border-[#F1F5F9] border-t px-5 py-5 text-[#191c1e] text-sm sm:px-8">
					{account.company && (
						<li className="flex items-center gap-2.5">
							<Building2 className="h-4 w-4 shrink-0 text-[#64748B]" />
							<span className="min-w-0 break-words">{account.company}</span>
						</li>
					)}
					{account.location && (
						<li className="flex items-center gap-2.5">
							<MapPin className="h-4 w-4 shrink-0 text-[#64748B]" />
							<span className="min-w-0 break-words">{account.location}</span>
						</li>
					)}
					{account.email && (
						<li className="flex items-center gap-2.5">
							<Mail className="h-4 w-4 shrink-0 text-[#64748B]" />
							<a
								href={`mailto:${account.email}`}
								className="min-w-0 break-all text-[#059669] hover:underline"
							>
								{account.email}
							</a>
						</li>
					)}
					{account.twitterUsername && (
						<li className="flex items-center gap-2.5">
							<AtSign className="h-4 w-4 shrink-0 text-[#64748B]" />
							<a
								href={`https://twitter.com/${account.twitterUsername}`}
								target="_blank"
								rel="noopener noreferrer"
								className="text-[#059669] hover:underline"
							>
								@{account.twitterUsername}
							</a>
						</li>
					)}
					{memberSince && (
						<li className="flex items-center gap-2.5">
							<CalendarDays className="h-4 w-4 shrink-0 text-[#64748B]" />
							<span>{memberSince}加入 GitHub</span>
						</li>
					)}
				</ul>
			</section>

			<div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
				<Link
					to="/"
					className="inline-flex items-center gap-2 text-[#64748B] text-sm transition-colors hover:text-[#0F172A]"
				>
					<ArrowLeft className="h-4 w-4" />
					返回首页
				</Link>
				<p className="text-[#64748B] text-xs sm:text-right">
					数据保存于 PostgreSQL · 更新于 {updatedAtText}
				</p>
			</div>
		</main>
	);
}
