import dotenv from "dotenv";
import path from "path";
// Load .env.local specifically since Next.js uses it for development environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
