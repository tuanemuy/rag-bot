import { AnyError } from "@/lib/error";

export class ApplicationError extends AnyError {
  override readonly name: string = "ApplicationError";

  constructor(
    public readonly code: string,
    message: string,
    cause?: unknown,
  ) {
    super(message, cause);
  }
}

export const NotFoundErrorCode = {
  NotFound: "NOT_FOUND",
  // ${Entity}NotFound: "${ENTITY}_NOT_FOUND",
  // Other not found error codes can be added here
} as const;
export type NotFoundErrorCode =
  (typeof NotFoundErrorCode)[keyof typeof NotFoundErrorCode];

export class NotFoundError extends ApplicationError {
  override readonly name = "NotFoundError";

  constructor(
    public readonly code: NotFoundErrorCode,
    message: string,
    cause?: unknown,
  ) {
    super(code, message, cause);
  }
}

export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}

export const ConflictErrorCode = {
  Conflict: "CONFLICT",
  // ${Entity}Conflict: "${ENTITY}_CONFLICT",
  // Other conflict error codes can be added here
} as const;
export type ConflictErrorCode =
  (typeof ConflictErrorCode)[keyof typeof ConflictErrorCode];

export class ConflictError extends ApplicationError {
  override readonly name = "ConflictError";

  constructor(
    public readonly code: ConflictErrorCode,
    message: string,
    cause?: unknown,
  ) {
    super(code, message, cause);
  }
}

export function isConflictError(error: unknown): error is ConflictError {
  return error instanceof ConflictError;
}

export const UnauthenticatedErrorCode = {
  AuthenticationRequired: "AUTHENTICATION_REQUIRED",
  TokenExpired: "TOKEN_EXPIRED",
  InvalidToken: "INVALID_TOKEN",
  InvalidCredentials: "INVALID_CREDENTIALS",
  UserNotFound: "USER_NOT_FOUND",
  InvalidAuthType: "INVALID_AUTH_TYPE",
  ProviderMismatch: "PROVIDER_MISMATCH",
  // Other unauthenticated error codes can be added here
} as const;
export type UnauthenticatedErrorCode =
  (typeof UnauthenticatedErrorCode)[keyof typeof UnauthenticatedErrorCode];

export class UnauthenticatedError extends ApplicationError {
  override readonly name = "UnauthenticatedError";

  constructor(
    public readonly code: UnauthenticatedErrorCode,
    message: string,
    cause?: unknown,
  ) {
    super(code, message, cause);
  }
}

export function isUnauthenticatedError(
  error: unknown,
): error is UnauthenticatedError {
  return error instanceof UnauthenticatedError;
}

export const ForbiddenErrorCode = {
  InsufficientPermissions: "INSUFFICIENT_PERMISSIONS",
  // Other forbidden error codes can be added here
} as const;
export type ForbiddenErrorCode =
  (typeof ForbiddenErrorCode)[keyof typeof ForbiddenErrorCode];

export class ForbiddenError extends ApplicationError {
  override readonly name = "ForbiddenError";

  constructor(
    public readonly code: ForbiddenErrorCode,
    message: string,
    cause?: unknown,
  ) {
    super(code, message, cause);
  }
}

export function isForbiddenError(error: unknown): error is ForbiddenError {
  return error instanceof ForbiddenError;
}

export const ValidationErrorCode = {
  InvalidInput: "INVALID_INPUT",
  // Other validation error codes can be added here
} as const;
export type ValidationErrorCode =
  (typeof ValidationErrorCode)[keyof typeof ValidationErrorCode];

export class ValidationError extends ApplicationError {
  override readonly name = "ValidationError";

  constructor(
    public readonly code: ValidationErrorCode,
    message: string,
    cause?: unknown,
  ) {
    super(code, message, cause);
  }
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export const SystemErrorCode = {
  InternalServerError: "INTERNAL_SERVER_ERROR",
  DatabaseError: "DATABASE_ERROR",
  DataInconsistency: "DATA_INCONSISTENCY",
  NetworkError: "NETWORK_ERROR",
  RateLimitExceeded: "RATE_LIMIT_EXCEEDED",
  // Index-related error codes
  IndexAddFailed: "INDEX_ADD_FAILED",
  IndexClearFailed: "INDEX_CLEAR_FAILED",
  IndexQueryFailed: "INDEX_QUERY_FAILED",
  IndexStatusFailed: "INDEX_STATUS_FAILED",
  // Other system-level error codes can be added here
} as const;
export type SystemErrorCode =
  (typeof SystemErrorCode)[keyof typeof SystemErrorCode];

export class SystemError extends ApplicationError {
  override readonly name = "SystemError";

  constructor(
    public readonly code: SystemErrorCode,
    message: string,
    cause?: unknown,
  ) {
    super(code, message, cause);
  }
}

export function isSystemError(error: unknown): error is SystemError {
  return error instanceof SystemError;
}
