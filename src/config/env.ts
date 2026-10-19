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
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env: Env = {
  PORT: parseInt(process.env["PORT"] ?? "3001", 10),
  HOST: process.env["HOST"] ?? "0.0.0.0",
  DATABASE_URL: requireEnv("DATABASE_URL"),
  CORS_ORIGIN: process.env["CORS_ORIGIN"] ?? "http://localhost:3000",
  FRONTEND_URL: process.env["FRONTEND_URL"] ?? process.env["CORS_ORIGIN"] ?? "http://localhost:3000",
  CORS_PREVIEW_SUFFIX: process.env["CORS_PREVIEW_SUFFIX"] ?? "",
  NODE_ENV: (process.env["NODE_ENV"] as Env["NODE_ENV"]) ?? "development",
  CLOUDINARY_CLOUD_NAME: process.env["CLOUDINARY_CLOUD_NAME"] ?? "",
  CLOUDINARY_API_KEY: process.env["CLOUDINARY_API_KEY"] ?? "",
  CLOUDINARY_API_SECRET: process.env["CLOUDINARY_API_SECRET"] ?? "",
};

