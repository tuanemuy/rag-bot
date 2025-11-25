import type { Context } from "hono";
import {
  isConflictError,
  isForbiddenError,
  isNotFoundError,
  isSystemError,
  isUnauthenticatedError,
  isValidationError,
} from "@/core/application/error";
import { isBusinessRuleError } from "@/core/domain/error";
import type { HonoEnv } from "./app";

export function errorHandler(error: Error, c: Context<HonoEnv>) {
  const container = c.get("container");

  if (isNotFoundError(error)) {
    container?.logger.warn("Not found error", {
      code: error.code,
      message: error.message,
      path: c.req.path,
    });
    return c.json(
      {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      404,
    );
  }

  if (isConflictError(error)) {
    container?.logger.warn("Conflict error", {
      code: error.code,
      message: error.message,
      path: c.req.path,
    });
    return c.json(
      {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      409,
    );
  }

  if (isUnauthenticatedError(error)) {
    container?.logger.warn("Unauthenticated error", {
      code: error.code,
      message: error.message,
      path: c.req.path,
    });
    return c.json(
      {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      401,
    );
  }

  if (isForbiddenError(error)) {
    container?.logger.warn("Forbidden error", {
      code: error.code,
      message: error.message,
      path: c.req.path,
    });
    return c.json(
      {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      403,
    );
  }

  if (isValidationError(error)) {
    container?.logger.warn("Validation error", {
      code: error.code,
      message: error.message,
      path: c.req.path,
    });
    return c.json(
      {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      400,
    );
  }

  if (isBusinessRuleError(error)) {
    container?.logger.warn("Business rule error", {
      code: error.code,
      message: error.message,
      path: c.req.path,
    });
    return c.json(
      {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      400,
    );
  }

  if (isSystemError(error)) {
    container?.logger.error("System error", error, {
      code: error.code,
      path: c.req.path,
    });
    return c.json(
      {
        error: {
          code: error.code,
          message: "Internal server error",
        },
      },
      500,
    );
  }

  // Unknown error
  container?.logger.error("Unknown error", error, {
    path: c.req.path,
  });
  return c.json(
    {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
      },
    },
    500,
  );
}
