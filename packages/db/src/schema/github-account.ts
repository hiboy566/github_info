import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const githubAccounts = pgTable(
	"github_accounts",
	{
		id: text("id").primaryKey(),
		githubId: text("github_id").notNull().unique(),
		login: text("login").notNull(),
		name: text("name"),
		avatarUrl: text("avatar_url"),
		email: text("email"),
		company: text("company"),
		location: text("location"),
		bio: text("bio"),
		twitterUsername: text("twitter_username"),
		publicRepos: integer("public_repos").notNull().default(0),
		followers: integer("followers").notNull().default(0),
		following: integer("following").notNull().default(0),
		githubCreatedAt: timestamp("github_created_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [index("github_accounts_login_idx").on(table.login)],
);
