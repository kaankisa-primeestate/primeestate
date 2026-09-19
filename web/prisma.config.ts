import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Generate/build işlemleri DATABASE_URL olmadan da çalışabilsin.
    // Migration/deploy komutları gerçek DATABASE_URL olmadan çalıştırılmamalıdır.
    url:
      process.env.DATABASE_URL ??
      "postgresql://placeholder:placeholder@localhost:5432/primeestate?schema=public",
  },
});
