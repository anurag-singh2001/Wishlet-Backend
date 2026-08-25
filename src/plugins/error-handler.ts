import type { FastifyInstance, FastifyError } from "fastify";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public errorCode: string,
    message: string
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

    if (error instanceof Prisma.PrismaClientInitializationError || error instanceof Prisma.PrismaClientKnownRequestError) {
      app.log.error(error);
      return reply.status(503).send({
        error: "DATABASE_ERROR",
        message: "Unable to connect to database. Please check DATABASE_URL in backend/.env",
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
