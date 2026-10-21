import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { wishService } from "./services/wish.service.js";

const PURGE_INTERVAL_MS = 60 * 60 * 1000;

async function start() {
  const app = await buildApp();

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    console.log(`🚀 Wishlet API running at http://${env.HOST}:${env.PORT}`);
    setInterval(() => {
      wishService
        .purgeExpired()
        .then((count) => console.log(`Purged ${count} expired wishes`))
        .catch((err: unknown) => console.error("Expiry purge failed", err));
    }, PURGE_INTERVAL_MS).unref();
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
