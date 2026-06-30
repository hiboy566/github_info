import type { GithubAccount } from "@github_info/api/github/client";
import { cn } from "@github_info/ui/lib/utils";
import {
	Building2,
	CalendarDays,
	ExternalLink,
	Hash,
	Mail,
	MapPin,
} from "lucide-react";

type AccountCardProps = {
	account: GithubAccount;
	className?: string;
};

/** Ensure blog URLs are absolute so the anchor link navigates correctly. */
function normalizeBlogHref(blog: string): string {
	return blog.startsWith("http") ? blog : `https://${blog}`;
}

/**
 * Pure display component that renders a GitHub account information card.
 *
 * Visual spec (ui/DESIGN.md – Clinical Precision):
 *  • Raised surface: white bg, 8px radius, Clinical Shadow (#0F172A @ 7 % blur).
 *  • Navy header strip for @login.
 *  • 2-column stats grid with tabular numbers and label-caps labels.
 *  • Null fields are gracefully omitted.
 */
export function AccountCard({ account, className }: AccountCardProps) {
	const formattedDate = new Date(account.createdAt).toLocaleDateString(
		"en-US",
		{ year: "numeric", month: "long", day: "numeric" },
	);

	return (
		<div
			className={cn(
				// Raised surface
				"overflow-hidden rounded-lg border border-[#E2E8F0] bg-white",
				"shadow-[0_4px_16px_0_rgba(15,23,42,0.07)]",
				className,
			)}
		>
			{/* Navy header strip — always shows @login */}
			<div className="bg-[#0F172A] px-6 py-3">
				<span className="font-medium text-sm text-white tracking-wide">
					@{account.login}
				</span>
			</div>

			<div className="p-6">
				{/* Avatar + name row */}
				<div className="mb-5 flex items-center gap-4">
					{account.avatarUrl && (
						<img
							src={account.avatarUrl}
							alt={`${account.login}'s avatar`}
							className="h-16 w-16 shrink-0 rounded-full border-2 border-[#E2E8F0] object-cover"
						/>
					)}
					<div>
						{account.name && (
							<p className="font-semibold text-[#0F172A] text-lg leading-tight">
								{account.name}
							</p>
						)}
						<p className="text-[#64748B] text-sm">{account.login}</p>
					</div>
				</div>

				{/* Bio — full-width row, omitted when null */}
				{account.bio && (
					<p className="mb-5 text-[#45464d] text-sm leading-relaxed">
						{account.bio}
					</p>
				)}

				{/* 2-column stats grid; numbers use tabular-nums, labels use label-caps */}
				<div className="mb-5 grid grid-cols-2 gap-3">
					<div className="rounded border border-[#E2E8F0] bg-[#F8FAFC] p-3">
						<p className="font-semibold text-[#0F172A] text-xl tabular-nums">
							{account.publicRepos}
						</p>
						<p className="mt-0.5 font-medium text-[#64748B] text-xs uppercase tracking-[0.05em]">
							Public Repos
						</p>
					</div>
					<div className="rounded border border-[#E2E8F0] bg-[#F8FAFC] p-3">
						<p className="font-semibold text-[#0F172A] text-xl tabular-nums">
							{account.followers}
						</p>
						<p className="mt-0.5 font-medium text-[#64748B] text-xs uppercase tracking-[0.05em]">
							Followers
						</p>
					</div>
					{/* Following spans both columns so the row stays even */}
					<div className="col-span-2 rounded border border-[#E2E8F0] bg-[#F8FAFC] p-3">
						<p className="font-semibold text-[#0F172A] text-xl tabular-nums">
							{account.following}
						</p>
						<p className="mt-0.5 font-medium text-[#64748B] text-xs uppercase tracking-[0.05em]">
							Following
						</p>
					</div>
				</div>

				{/* Meta fields list — items omitted when their value is null */}
				<ul className="space-y-2.5 border-[#F1F5F9] border-t pt-4 text-[#191c1e] text-sm">
					{/* GitHub user ID — always present (F-004) */}
					<li className="flex items-center gap-2.5">
						<Hash className="h-4 w-4 shrink-0 text-[#64748B]" />
						<span>
							<span className="mr-1.5 font-medium text-[#64748B] text-xs uppercase tracking-[0.05em]">
								User ID
							</span>
							<span className="tabular-nums">{account.githubId}</span>
						</span>
					</li>
					{/* Email — omitted when null (F-004) */}
					{account.email && (
						<li className="flex items-center gap-2.5">
							<Mail className="h-4 w-4 shrink-0 text-[#64748B]" />
							<span>{account.email}</span>
						</li>
					)}
					{account.company && (
						<li className="flex items-center gap-2.5">
							<Building2 className="h-4 w-4 shrink-0 text-[#64748B]" />
							<span>{account.company}</span>
						</li>
					)}
					{account.location && (
						<li className="flex items-center gap-2.5">
							<MapPin className="h-4 w-4 shrink-0 text-[#64748B]" />
							<span>{account.location}</span>
						</li>
					)}
					{account.blog && (
						<li className="flex items-center gap-2.5">
							<ExternalLink className="h-4 w-4 shrink-0 text-[#64748B]" />
							<a
								href={normalizeBlogHref(account.blog)}
								target="_blank"
								rel="noopener noreferrer"
								className="truncate text-[#059669] hover:underline"
							>
								{account.blog}
							</a>
						</li>
					)}
					<li className="flex items-center gap-2.5">
						<CalendarDays className="h-4 w-4 shrink-0 text-[#64748B]" />
						<span>
							<span className="mr-1.5 font-medium text-[#64748B] text-xs uppercase tracking-[0.05em]">
								Member since
							</span>
							{formattedDate}
						</span>
					</li>
				</ul>
			</div>
		</div>
	);
}
