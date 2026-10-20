/**
 * JSON:API document types.
 *
 * Per JSON:API 1.1 (https://jsonapi.org/format/1.1/), a document MUST contain at least one of `data`, `errors`, or
 * `meta` at the top level. `data` and `errors` MUST NOT coexist in the same document.
 *
 * - `JsonApiBaseDocument` — shared top-level fields (`jsonapi`, `links`, `meta`)
 * - `JsonApiSuccessDocument` — discriminated union of singular and collection success variants
 * - `JsonApiErrorDocument` — error variant with `errors: readonly JsonApiResponseError[]`
 * - `JsonApiDocument` — discriminated union of success and error variants
 *
 * Structural discriminants:
 *
 * - `'data' in document` → success
 * - `'errors' in document` → error
 * - `Array.isArray(document.data)` → collection (when success)
 * - `document.data === null` → empty to-one (when singular)
 */

import type { RequireAtLeastOne } from 'type-fest';

/**
 * Shared base for all JSON:API document variants.
 *
 * Per JSON:API 1.1 §Document Top Level, both success and error documents MAY include `jsonapi`, `links`, and `meta` at
 * the top level.
 */
export interface JsonApiBaseDocument {
  readonly jsonapi?: { readonly version?: string };
  readonly links?: Record<string, unknown>;
  readonly meta?: Record<string, unknown>;
}

/**
 * JSON:API success document with a collection primary data payload.
 *
 * Per JSON:API 1.1, collection primary data MUST be an array of resource objects, an array of resource identifier
 * objects, or an empty array `[]` (for empty to-many relationships). `data` is REQUIRED and is never `undefined`.
 */
export interface JsonApiCollectionSuccessDocument extends JsonApiBaseDocument {
  readonly data: readonly (JsonApiResource | ResourceIdentifier)[];
  readonly included?: readonly JsonApiResource[] | undefined;
}

/**
 * JSON:API document — discriminated union of success and error variants.
 *
 * The structural discriminant is the presence of `data` versus `errors`: `'data' in document` for success, `'errors' in
 * document` for error. Per JSON:API 1.1 §Document Top Level, the two MUST NOT coexist in the same document.
 */
export type JsonApiDocument = JsonApiErrorDocument | JsonApiSuccessDocument;

/**
 * JSON:API error document.
 *
 * Per JSON:API 1.1 §Document Top Level, `data` and `errors` MUST NOT coexist in the same document. This variant carries
 * `errors`; the success variants below carry `data`.
 */
export interface JsonApiErrorDocument extends JsonApiBaseDocument {
  readonly errors: readonly JsonApiResponseError[];
}

/**
 * JSON:API resource object.
 */
export interface JsonApiResource {
  readonly attributes?: Record<string, unknown>;
  readonly id: string;
  readonly meta?: Record<string, unknown>;
  readonly relationships?: Record<
    string,
    RequireAtLeastOne<
      {
        readonly data:
          null | readonly ResourceIdentifier[] | ResourceIdentifier | undefined;
        readonly links?: Record<string, string>;
        readonly meta?: Record<string, unknown>;
      },
      'data' | 'links' | 'meta'
    >
  >;
  readonly type: string;
}

/**
 * A single JSON:API error object.
 *
 * Per JSON:API 1.1 §Errors, each error object MUST contain at least one of `code` or `status`, SHOULD contain `title`
 * and `detail`, and MAY contain `id`, `links`, `source`, and `meta`.
 */
export interface JsonApiResponseError {
  readonly code?: string;
  readonly detail?: string;
  readonly id?: string;
  readonly links?: Record<string, unknown>;
  readonly meta?: Record<string, unknown>;
  readonly source?: Record<string, unknown>;
  readonly status?: string;
  readonly title?: string;
}

/**
 * JSON:API success document with a singular primary data payload.
 *
 * Per JSON:API 1.1, singular primary data MUST be either a single resource object, a single resource identifier object,
 * or `null` (for empty to-one relationships). `data` is REQUIRED and is never `undefined`.
 */
export interface JsonApiSingularSuccessDocument extends JsonApiBaseDocument {
  readonly data: JsonApiResource | null | ResourceIdentifier;
  readonly included?: readonly JsonApiResource[] | undefined;
}

/**
 * JSON:API success document — discriminated by whether `data` is an array (collection) or not (singular).
 *
 * The structural discriminant is `Array.isArray(document.data)`.
 */
export type JsonApiSuccessDocument =
  JsonApiCollectionSuccessDocument | JsonApiSingularSuccessDocument;

/**
 * Resource identifier for JSON:API resources.
 */
export interface ResourceIdentifier {
  readonly id: string;
  readonly type: string;
}
