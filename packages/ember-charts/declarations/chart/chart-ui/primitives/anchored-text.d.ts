/**
 * Anchored Text Primitives
 *
 * Provides text rendering primitives for LightweightCharts that can be anchored to specific positions within series or
 * panes. These primitives are used for displaying labels on the chart.
 *
 * Two primitive types are provided:
 *
 * - AnchoredSeriesPrimitive: For series-level labels (attached via series.attachPrimitive)
 * - AnchoredPanePrimitive: For pane-level labels (attached via pane.attachPrimitive)
 *
 * Both share the same rendering logic but implement different primitive interfaces.
 */
import type { IPanePrimitiveBase, PaneAttachedParameter, Time } from 'lightweight-charts';
import { CanvasRenderingTarget2D } from 'fancy-canvas';
/**
 * AnchoredTextOptions
 *
 * Configuration options for anchored text rendering.
 */
export interface AnchoredTextOptions {
    /**
     * Text color
     */
    color: string;
    /**
     * Font specification (e.g., 'italic bold 12px Arial')
     */
    font: string;
    /**
     * Horizontal alignment
     */
    horzAlign: 'left' | 'middle' | 'right';
    /**
     * Line height in pixels
     */
    lineHeight: number;
    /**
     * Text content to display
     */
    text: string;
    /**
     * Vertical alignment
     */
    vertAlign: 'bottom' | 'middle' | 'top';
}
/**
 * AnchoredTextPaneView
 *
 * View implementation for pane primitives.
 */
declare class AnchoredTextPaneView {
    private readonly _source;
    constructor(_source: AnchoredPanePrimitive);
    renderer(): AnchoredTextRenderer;
    update(): void;
}
/**
 * AnchoredTextRenderer
 *
 * Shared renderer implementation for both pane and series primitives. Handles the actual canvas drawing logic.
 */
declare class AnchoredTextRenderer {
    private readonly _options;
    constructor(_options: AnchoredTextOptions);
    draw(target: CanvasRenderingTarget2D): void;
}
/**
 * AnchoredPanePrimitive
 *
 * Pane-level primitive for displaying anchored text. Attached to panes via pane.attachPrimitive().
 */
export declare class AnchoredPanePrimitive implements IPanePrimitiveBase<PaneAttachedParameter<Time>> {
    _options: AnchoredTextOptions;
    private _paneView;
    private _requestUpdate?;
    constructor(options: AnchoredTextOptions);
    /**
     * Update the text options and request a redraw
     */
    applyOptions(options: Partial<AnchoredTextOptions>): void;
    attached({ requestUpdate }: PaneAttachedParameter<Time>): void;
    detached(): void;
    paneViews(): readonly AnchoredTextPaneView[];
    updateAllViews(): void;
}
/**
 * Create a pane primitive with default styling for labels. Uses theme-aware color from CSS variables.
 */
export declare function createPaneLabelPrimitive(text: string): AnchoredPanePrimitive;
export {};
//# sourceMappingURL=anchored-text.d.ts.map