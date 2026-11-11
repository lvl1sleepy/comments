import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

interface RequestContext {
  requestId: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function getRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}

export const requestContextMiddleware: RequestHandler = (_req, res, next) => {
  const requestId = randomUUID();

  // Make the ID available to clients and Express loggers.
  res.setHeader("X-Request-ID", requestId);
  res.locals.requestId = requestId;

  // All downstream asynchronous work can access this context.
  storage.run({ requestId }, () => {
    next();
  });
};
