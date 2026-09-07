import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgres://mirror:mirror_dev_only@localhost:5432/mirror",
  },
  strict: true,
  verbose: true,
});
