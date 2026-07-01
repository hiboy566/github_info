import { createContext } from "@github_info/api/context";
import { appRouter } from "@github_info/api/routers/index";
import { auth } from "@github_info/auth";
import { env } from "@github_info/env/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { handle } from "hono/aws-lambda";

const app = new Hono();

if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  app.use(logger());
}
app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.use(
  "/trpc/*",
  async (c) =>
    fetchRequestHandler({
      endpoint: "/trpc",
      req: c.req.raw,
    router: appRouter,
      createContext: () => createContext({ context: c }),
    }),
);

app.get("/", (c) => {
  return c.text("OK");
});

export const handler = handle(app);

if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  const { serve } = await import("@hono/node-server");

  serve(
    {
      fetch: app.fetch,
      port: 3000,
    },
    (info) => {
      console.log(`Server is running on http://localhost:${info.port}`);
    },
  );
}
