import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

if (!process.env.DATABASE_URL && process.env.MONGO_URL) {
  process.env.DATABASE_URL = process.env.MONGO_URL;
}

if (!process.env.AUTH_SECRET) {
  process.env.AUTH_SECRET = "phase4-test-secret-min-32-characters!!";
}
