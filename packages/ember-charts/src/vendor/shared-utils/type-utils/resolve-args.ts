import type { KeysOfUnion, Simplify } from 'type-fest';

/**
 * Merges a discriminated union of TArgs into a single shape where discriminated fields become unions.
 *
 * This is useful when you have mode-discriminated TArgs (like ConfigFieldSelectSingleTArgs |
 * ConfigFieldSelectMultiTArgs) and want to derive a type that supports ALL modes.
 *
 * ## How It Works
 *
 * Given a union of TArgs:
 *
 * ```typescript
 * type SelectTArgs = ConfigFieldSelectSingleTArgs | ConfigFieldSelectMultiTArgs;
 * // Single: { mode: 'single'; variant: 'dropdown' | 'radioGroup'; ... }
 * // Multi:  { mode: 'multi'; variant: 'checkboxGroup' | 'dropdownMulti'; ... }
 * ```
 *
 * MergeTArgsUnion produces:
 *
 * ```typescript
 * // { mode: 'single' | 'multi'; variant: 'dropdown' | 'radioGroup' | 'checkboxGroup' | 'dropdownMulti'; ... }
 * ```
 *
 * @example
 *
 * ```typescript
 * type MergedSelectTArgs = MergeTArgsUnion<ConfigFieldSelectTArgs>;
 * // Now usable with UseArgs and derivation helpers
 * ```
 *
 * @template TUnion - A union of TArgs types (each branded with MakeTArgs)
 */
export type MergeTArgsUnion<TUnion extends TArgsShape> = Simplify<
  TUnion extends TArgsBrand<infer TOriginal>
    ? MergeUnionToSingleShape<TUnion> &
        TArgsBrand<MergeUnionToSingleShape<TOriginal>>
    : MergeUnionToSingleShape<TUnion>
>;

/**
 * Merges a union of object types into a single object where each key's type is the union of all values for that key.
 *
 * This "widens" discriminated unions into a single shape.
 *
 * @example
 *
 * ```typescript
 * type A = { mode: 'single'; value: string };
 * type B = { mode: 'multi'; value: string[] };
 * type Merged = MergeUnionToSingleShape<A | B>;
 * // { mode: 'single' | 'multi'; value: string | string[] }
 * ```
 */
export type MergeUnionToSingleShape<TUnion> = {
  [K in KeysOfUnion<TUnion>]: TUnion extends { [P in K]: infer V } ? V : never;
};

declare const __tArgsConstraintBrand: unique symbol;
declare const __tArgsOriginalConstraint: unique symbol;

/**
 * ExtendTArgs:
 *
 * Extends an already-branded TArgs with additional fields.
 *
 * This properly merges the extension into both the partial surface (for overrides) and the internal brand constraint
 * (so `UseArgs` resolves the extended fields correctly).
 *
 * Use this when a variant TArgs needs to extend a base TArgs with additional fields.
 *
 * @example
 *
 * ```typescript
 * // Base TArgs for all config fields
 * type ConfigFieldBaseTArgs<TValue> = MakeTArgs<{ slug: string; value: TValue; ... }>;
 *
 * // Boolean variant extends base with variant field
 * type ConfigFieldBooleanTArgs = ExtendTArgs<ConfigFieldBaseTArgs<boolean>, {
 *   type: 'boolean';
 *   variant: 'checkbox' | 'switch';
 * }>;
 *
 * // UseArgs<ConfigFieldBooleanTArgs> now includes both base and extended fields
 * ```
 *
 * @template TBase - The base TArgs to extend (must be a branded TArgs)
 * @template TExtension - Additional fields to add
 */
export type ExtendTArgs<
  TBase extends TArgsShape,
  TExtension extends object,
> = Simplify<
  Readonly<Partial<TExtension>> &
    TArgsBrand<TBase[typeof __tArgsOriginalConstraint] & TExtension> &
    TBase
>;

/**
 * GetArg:
 *
 * Strict deep access into the resolved args shape (`UseArgs<TArgs>`) using a string path.
 */
export type GetArg<
  TArgs extends TArgsShape,
  TPath extends keyof UseArgs<TArgs>,
> = UseArgs<TArgs>[TPath];

/**
 * MakeTArgs:
 *
 * Produces a branded, partial override shape for the generic parameter.
 *
 * - All keys become optional in the returned type (allowing partial overrides).
 * - The original constraint shape is embedded via `__tArgsOriginalConstraint` so `UseArgs` can restore correct
 *   optionality and apply fallbacks.
 */
export type MakeTArgs<TConstraintShape extends object> = Simplify<
  Readonly<Partial<TConstraintShape>> & TArgsBrand<TConstraintShape>
>;

/**
 * PickArgs:
 *
 * Strictly pick a subset of keys from the resolved args shape (`UseArgs<TArgs>`).
 *
 * - `TKeys` MUST be keys of `UseArgs<TArgs>` (enforced)
 * - Returns a simplified `Pick<>` for nicer IntelliSense
 */
export type PickArgs<
  TArgs extends TArgsShape,
  TKeys extends keyof UseArgs<TArgs>,
> = Simplify<Pick<UseArgs<TArgs>, TKeys>>;

/**
 * Brand marker for all TArgs shapes (brand key is required by design).
 */
export type TArgsBrand<TOriginal = unknown> = {
  readonly [__tArgsConstraintBrand]: 'TArgsConstraint';
  readonly [__tArgsOriginalConstraint]: TOriginal;
};

/**
 * Base constraint for TArgs shapes.
 *
 * A valid TArgs must be branded.
 */
export type TArgsShape = Partial<object> & TArgsBrand<unknown>;

/**
 * UseArgs:
 *
 * Resolves the final concrete shape by merging overrides into the constraint.
 */
export type UseArgs<TArgs extends TArgsShape> = Simplify<
  ResolveOriginalConstraint<TArgs[typeof __tArgsOriginalConstraint]>
>;

type ResolveOriginalConstraint<TOriginal> = {
  readonly [K in keyof TOriginal]: object extends Pick<TOriginal, K>
    ? TOriginal[K]
    : NonNullable<TOriginal[K]>;
};
