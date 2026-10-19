import type { FastifyInstance, FastifyError } from "fastify";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public errorCode: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function setupErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError | Error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        message: "Invalid request payload",
        details: error.issues,
      });
    }

    if (error instanceof ApiError) {
      return reply.status(error.statusCode).send({
        error: error.errorCode,
        message: error.message,
      });
    }

    const status = (error as FastifyError).statusCode;
    if (status && status >= 400 && status < 500) {
      return reply.status(status).send({
        error: status === 413 ? "PAYLOAD_TOO_LARGE" : "BAD_REQUEST",
        message: error.message,
      });
    }

    // P1xxx codes are connection/auth failures; anything else is a query or schema problem.
    const isConnectionError =
      error instanceof Prisma.PrismaClientInitializationError ||
      (error instanceof Prisma.PrismaClientKnownRequestError && error.code.startsWith("P1"));
    if (isConnectionError) {
      app.log.error(error);
      return reply.status(503).send({
        error: "DATABASE_UNAVAILABLE",
        message: "Unable to connect to database. Please check DATABASE_URL in backend/.env",
      });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      app.log.error(error);
      return reply.status(500).send({
        error: "DATABASE_ERROR",
        message: `Database query failed (${error.code}). Check the server logs.`,
      });
    }

    app.log.error(error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return reply.status(500).send({
      error: "INTERNAL_ERROR",
      message,
    });
  });
}
