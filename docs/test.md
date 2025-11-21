# Testing

- Use `pnpm test` for tests
- Create empty adapters in `src/core/adapters/empty/` and use `vi.spyOn` to mock external services in tests

## Application Service Tests

- Use `src/core/application/${domain}/${usecase}.test.ts` for unit tests of application services
