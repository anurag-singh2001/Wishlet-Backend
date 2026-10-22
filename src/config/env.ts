import "dotenv/config";

export interface Env {
  PORT: number;
  HOST: string;
  DATABASE_URL: string;
  CORS_ORIGIN: string;
  FRONTEND_URL: string;
  CORS_PREVIEW_SUFFIX: string;
  NODE_ENV: "development" | "production" | "test";
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
  WISH_TTL_HOURS: number;
  REACTION_SALT: string;
  GOOGLE_CLIENT_ID: string;
  JWT_SECRET: string;
  AUTH_TOKEN_DAYS: number;
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function parsePositive(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return raw && Number.isFinite(n) && n > 0 ? n : fallback;
}

const DEV_REACTION_SALT = "wishlet-dev-reaction-salt";
const reactionSalt = process.env["REACTION_SALT"];
if (!reactionSalt && process.env["NODE_ENV"] === "production") {
  console.warn("REACTION_SALT is not set; using an insecure default. Set it on the host.");
}

const DEV_JWT_SECRET = "wishlet-dev-jwt-secret-not-for-production";
const jwtSecret = process.env["JWT_SECRET"];
if (!jwtSecret && process.env["NODE_ENV"] === "production") {
  console.warn("JWT_SECRET is not set; using an insecure default. Set it on the host.");
}

export const env: Env = {
  PORT: parseInt(process.env["PORT"] ?? "3001", 10),
  HOST: process.env["HOST"] ?? "0.0.0.0",
  DATABASE_URL: requireEnv("DATABASE_URL"),
  CORS_ORIGIN: process.env["CORS_ORIGIN"] ?? "http://localhost:3000",
  FRONTEND_URL:
    process.env["FRONTEND_URL"] ?? process.env["CORS_ORIGIN"] ?? "http://localhost:3000",
  CORS_PREVIEW_SUFFIX: process.env["CORS_PREVIEW_SUFFIX"] ?? "",
  NODE_ENV: (process.env["NODE_ENV"] as Env["NODE_ENV"]) ?? "development",
  CLOUDINARY_CLOUD_NAME: process.env["CLOUDINARY_CLOUD_NAME"] ?? "",
  CLOUDINARY_API_KEY: process.env["CLOUDINARY_API_KEY"] ?? "",
  CLOUDINARY_API_SECRET: process.env["CLOUDINARY_API_SECRET"] ?? "",
  WISH_TTL_HOURS: parsePositive(process.env["WISH_TTL_HOURS"], 24),
  REACTION_SALT: reactionSalt || DEV_REACTION_SALT,
  GOOGLE_CLIENT_ID:
    process.env["GOOGLE_CLIENT_ID"] ||
    "1075546711165-5o07m2m1kqjdcmotirkcdg8t96ehe9hr.apps.googleusercontent.com",
  JWT_SECRET: jwtSecret || DEV_JWT_SECRET,
  AUTH_TOKEN_DAYS: parsePositive(process.env["AUTH_TOKEN_DAYS"], 30),
};
