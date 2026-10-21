/**
 * Schedule After Render Utility
 *
 * Provides lifecycle-aware scheduling of work to run after the current render pass completes. Uses
 * `requestAnimationFrame` as the scheduling mechanism and `@ember/destroyable` for cleanup.
 *
 * This replaces the deprecated `schedule('afterRender', ...)` from `@ember/runloop` which:
 *
 * 1. Is not lifecycle-aware — callbacks aren't automatically cancelled when an object is destroyed
 * 2. Can lead to memory leaks and "calling methods on destroyed objects" errors
 * 3. Is flagged by the `ember/no-runloop` ESLint rule
 *
 * Why `requestAnimationFrame`:
 *
 * - Schedules work to run before the next browser paint, which occurs after Ember's render pass
 * - Native browser API — no dependencies needed
 * - Can be cancelled via `cancelAnimationFrame`, enabling proper cleanup
 *
 * Why not `queueMicrotask`:
 *
 * - Microtasks run too early — they execute before the current task completes
 * - Would still be in the tracking/render phase, causing "Cannot set property during render" errors
 */
/**
 * Mixin-style helper that adds lifecycle-aware "schedule after render" capability to a class.
 *
 * Call this in the constructor of your modifier/component to:
 *
 * 1. Set up a `scheduleWork` method for scheduling callbacks
 * 2. Register a destructor that cancels any pending work when the object is destroyed
 *
 * @example
 *
 * ```ts
 * class MyModifier extends Modifier<MySignature> {
 *   readonly #scheduleWork: (callback: () => void) => void;
 *
 *   constructor(owner: unknown, args: Args) {
 *     super(owner, args);
 *     this.#scheduleWork = createScheduleWorkHelper(this);
 *   }
 *
 *   modify() {
 *     this.#scheduleWork(() => {
 *       // This runs after render, and is cancelled if modifier is destroyed
 *     });
 *   }
 * }
 * ```;
 * ```
 */
export declare function createScheduleWorkHelper(destroyable: object): (callback: () => void) => void;
/**
 * Schedules a callback to run after the current render pass completes.
 *
 * @returns A cleanup function that cancels the scheduled work if not yet executed.
 */
export declare function scheduleAfterRender(callback: () => void): () => void;
//# sourceMappingURL=schedule-after-render.d.ts.map