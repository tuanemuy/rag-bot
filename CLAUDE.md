# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Principles

- Prioritize type safety by leveraging TypeScript's type system to the fullest extent
- Encourage a stateless, pure functional programming style

## Development Commands

- `pnpm lint` - Lint code with Biome
- `pnpm lint:fix` - Lint code with Biome and fix issues
- `pnpm format` - Format code with Biome
- `pnpm format:check` - Check code formatting with Biome
- `pnpm typecheck` - Type check code with tsc
- `pnpm test` - Run tests with Vitest
- `TEST_DOMAIN=${domain(lowercase)} pnpm test:domain` - Run tests with Vitest for a specific domain

## Code Quality

- Run `pnpm typecheck`, `pnpm run lint:fix` and `pnpm run format` after making changes to ensure code quality and consistency.

## Tech Stack

- **Runtime**: Node.js 22.x
- **API**: Hono
- **Database**: PostgreSQL with Drizzle ORM
- **RAG Framework**: LlamaIndex, LangChain, etc...
- **bot Framework**: Line Messaging API SDK

## Core Architecture

Hexagonal architecture with domain-driven design principles:

- **Domain Layer** (`src/core/domain/`): Contains business logic, types, and port interfaces
    - `src/core/domain/${domain}/entity.ts`: Domain entities
    - `src/core/domain/${domain}/valueObject.ts`: Value objects
    - `src/core/domain/${domain}/ports/**.ts`: Port interfaces for external services (repositories, exteranl APIs, etc.)
    - `src/core/domain/${domain}/services/**.ts`: Domain services for complex business logic
- **Adapter Layer** (`src/core/adapters/`): Contains concrete implementations for external services
    - `src/core/adapters/${externalServiceProvider}/**.ts`: Adapters for external services like databases, APIs, etc.
- **Application Layer** (`src/core/application/`): Contains use cases and application services
    - `src/core/application/container.ts`: Container type for dependency injection
    - `src/core/application/${domain}/${usecase}.ts`: Application services that orchestrate domain logic. Each service is a function that takes a context object.
    - `src/core/domain/error.ts`: Error types for business logic
    - `src/core/domain/${domain}/errorCode.ts`: Error codes for each domain
    - `src/core/applicaion/error.ts`: Error types for application layer

### Example Implementation

See `docs/implementation_example.md` for detailed examples of types, ports, adapters, application services and context object.

## API Architecture

Hono application code using:

- TypeScript
- Hono v4
- Zod for input validation

- Routes
    - `src/api/routes/`: Route handlers
- Middlewares
    - `src/api/middlewares/`: Middlewares for authentication, logging, etc.

## Error Handling

### Domain Layer

- `src/core/domain/error.ts`: Defines `BusinessRuleError`.
- `src/core/domain/${domain}/errorCode.ts`: Error codes are defined within each respective domain.
- Avoids using `try-catch`; throws a `BusinessRuleError` exception when a violation can be determined by the logic.

### Application Layer

- `src/core/application/error.ts`: Defines the following errors:
    - `NotFoundError`
    - `ConflictError`
    - `UnauthenticatedError`
    - `ForbiddenError`
    - `ValidationError`
    - `SystemError`
- Defines error codes for each as needed (e.g., a `NETWORK_ERROR` code for `SystemError`).
- Avoids using `try-catch`; throws these exceptions when a failure can be determined by the application logic.

### Infrastructure Layer

- Throws errors that are defined in the Domain and Application layers.
- Catches exceptions from external systems as necessary and transforms them into the errors defined above.

### Presentation Layer

- Catches all exceptions and transforms them into appropriate responses, such as HTTP errors.
