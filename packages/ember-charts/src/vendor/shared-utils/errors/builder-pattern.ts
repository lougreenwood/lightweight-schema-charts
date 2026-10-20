import type { BuilderPreconditionError } from '#src/vendor/shared-utils/errors/builder-error';
import type { Result, Task } from 'true-myth';

/**
 * Interface for the static side of classes that follow the builder pattern.
 *
 * Classes apply this via `satisfies` at definition site to enforce the contract. Builder classes MUST return Result or
 * Task with BuilderPreconditionError.
 *
 * Uses positional generics for proper variance handling:
 *
 * - TArgs: contravariant (function parameter)
 * - TInstance: covariant (return type success value)
 * - TError: covariant (return type error value)
 *
 * @template TArgs - Arguments object shape for the create method
 * @template TInstance - The instance type returned on success
 * @template TError - The error type returned on failure (must extend BuilderPreconditionError)
 * @template TReturnType - The full return type (Result or Task)
 */
export interface Buildable<
  TArgs extends object,
  TInstance,
  TError extends BuilderPreconditionError,
  TReturnType extends Result<TInstance, TError> | Task<TInstance, TError> =
    Result<TInstance, TError>,
> {
  create: BuilderCreate<TArgs, TReturnType>;
}

/**
 * Type constraint for builder pattern static create() methods.
 *
 * Enforces that builder classes return either a Result (synchronous) or Task (asynchronous) with:
 *
 * - Success: The constructed instance
 * - Error: BuilderPreconditionError wrapping all possible underlying errors in the cause field
 *
 * This is a type-level constraint, not a runtime interface (TypeScript doesn't support static interfaces well). Use it
 * to document and type-check builder create methods.
 *
 * ## Why Positional Generics (Not TOpts/TArgs Object Pattern)
 *
 * **IMPORTANT:** This type intentionally uses positional generics (`TArgs`, `TReturnType`) instead of a structured
 * object generic (e.g., `TOpts extends { args: ...; returnType: ... }`). This is required for correct variance handling
 * when the type is used in interface constraints.
 *
 * ### The Variance Problem with Object-Shaped Generics
 *
 * TypeScript applies variance rules to function types:
 *
 * - Function **parameters** are contravariant (narrower types can accept wider argument types)
 * - Function **return types** are covariant (narrower types must return narrower values)
 *
 * When a function type is nested inside an object-shaped generic, TypeScript struggles to correctly apply these
 * variance rules. The object wrapper can invert or flatten the variance, causing assignability checks to fail even when
 * the types should be compatible.
 *
 * ### Generic Example (The Problem)
 *
 * ```typescript
 * // ❌ WRONG: Object-shaped generic breaks variance
 * type HandlerCreate_BAD<TOpts extends { args: object; output: unknown }> = (args: TOpts['args']) => TOpts['output'];
 *
 * interface HandlerStatic_BAD<TOpts extends { args: object; output: unknown }> {
 *   create: HandlerCreate_BAD<TOpts>;
 * }
 *
 * // Concrete handler with specific args
 * class MyHandler {
 *   static create(args: { config: Config; context: Context }): Result<MyHandler, MyError> { ... }
 * }
 *
 * // ❌ TYPE ERROR: When used in a constraint like `satisfies HandlerStatic_BAD<...>`:
 * // - The default TOpts resolves args to `{}` (all optional via Partial patterns)
 * // - MyHandler.create expects `{ config, context }` (required fields)
 * // - Due to contravariance: `(args: {config, context}) => R` is NOT assignable to `(args: {}) => R`
 * // - TypeScript sees {} as "accepts anything" but the concrete handler is more restrictive
 * ```
 *
 * ### The Solution (Positional Generics)
 *
 * ```typescript
 * // ✅ CORRECT: Positional generics preserve variance
 * type HandlerCreate_GOOD<TArgs extends object, TOutput> = (args: TArgs) => TOutput;
 *
 * interface HandlerStatic_GOOD<TArgs extends object, TOutput> {
 *   create: HandlerCreate_GOOD<TArgs, TOutput>;
 * }
 *
 * // Now TypeScript correctly applies:
 * // - TArgs is contravariant (function parameter position)
 * // - TOutput is covariant (function return position)
 * // The constraint flows correctly and `satisfies` works as expected.
 * ```
 *
 * ### Why This Matters for Builder Patterns
 *
 * Builder patterns are commonly used with `satisfies` to enforce static-side contracts on classes. If the builder type
 * uses an object-shaped generic, the `satisfies` check fails because TypeScript cannot reconcile the variance between
 * the concrete class's create signature and the constraint's expected signature.
 *
 * By using positional generics, we ensure:
 *
 * 1. TypeScript correctly understands that `TArgs` is in contravariant position
 * 2. TypeScript correctly understands that `TReturnType` is in covariant position
 * 3. The `satisfies` check works correctly when concrete classes implement the builder pattern
 *
 * @example
 *
 * ```typescript
 * // Synchronous builder - returns Result
 * type NetworkSchedulerCreateResult = Result<
 *   NetworkRequestScheduler,
 *   BuilderPreconditionError<{
 *     errorCode: 'NETWORK_SCHEDULER_CREATE_FAILED';
 *     message: string;
 *     cause: BuildNetworkSchedulerConfigError;
 *   }>
 * >;
 *
 * class NetworkRequestScheduler {
 *   static create: BuilderCreate<
 *     { context: NetworkRequestSchedulerContext },
 *     NetworkSchedulerCreateResult
 *   > = ({ context }) => {
 *     return buildNetworkSchedulerConfig({ store: context.store }).mapErr((cause) =>
 *       PreconditionError.of({
 *         errorCode: 'NETWORK_SCHEDULER_CREATE_FAILED',
 *         message: 'Failed to create NetworkRequestScheduler: configuration build failed',
 *         cause,
 *       })
 *     );
 *   };
 * }
 *
 * // Asynchronous builder - returns Task
 * type TradingAccountProviderCreateResult = Task<
 *   SolanaWeb3LegacyTradingAccountProvider,
 *   BuilderPreconditionError<{
 *     errorCode: 'TRADING_ACCOUNT_PROVIDER_BUILD_FAILED';
 *     message: string;
 *     cause: PopulateCoreAssetsError;
 *   }>
 * >;
 *
 * class SolanaWeb3LegacyTradingAccountProvider {
 *   static create: BuilderCreate<
 *     { assetMarket: TMarket; context: HasLogger & HasStore },
 *     TradingAccountProviderCreateResult
 *   > = ({ assetMarket, context }) => {
 *     const provider = new SolanaWeb3LegacyTradingAccountProvider({ assetMarket, context });
 *     return provider.#populateCoreAssets().map(() => provider);
 *   };
 * }
 * ```;
 * ```
 *
 * @template TArgs - Arguments object shape for the builder function (contravariant position) @template TReturnType -
 * Result or Task type with instance and BuilderPreconditionError (covariant position)
 */
export type BuilderCreate<
  TArgs extends object,
  TReturnType extends
    | Result<unknown, BuilderPreconditionError>
    | Task<unknown, BuilderPreconditionError>,
> = (args: TArgs) => TReturnType;
