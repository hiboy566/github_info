import { Link } from "@tanstack/react-router";

export default function Header() {
	return (
		<header className="border-[#E2E8F0] border-b bg-white">
			<div className="mx-auto flex w-full max-w-[800px] items-center px-4 py-3 sm:px-6">
				<nav aria-label="主导航">
					<Link to="/" className="font-semibold text-[#0F172A] text-sm">
						github_info
					</Link>
				</nav>
			</div>
		</header>
	);
}
