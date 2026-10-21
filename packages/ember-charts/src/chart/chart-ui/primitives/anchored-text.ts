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

import type {
  IPanePrimitiveBase,
  PaneAttachedParameter,
  Time,
} from 'lightweight-charts';

import { CanvasRenderingTarget2D } from 'fancy-canvas';

import { getPaneLabelColor } from '../../theme/chart-theme';

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
class AnchoredTextPaneView {
  constructor(private readonly _source: AnchoredPanePrimitive) {}

  renderer(): AnchoredTextRenderer {
    return new AnchoredTextRenderer(this._source._options);
  }

  update(): void {
    // No-op: static text doesn't need updates
  }
}

/**
 * AnchoredTextRenderer
 *
 * Shared renderer implementation for both pane and series primitives. Handles the actual canvas drawing logic.
 */
class AnchoredTextRenderer {
  constructor(private readonly _options: AnchoredTextOptions) {}

  draw(target: CanvasRenderingTarget2D): void {
    target.useMediaCoordinateSpace((scope) => {
      const ctx = scope.context;
      ctx.font = this._options.font;
      const textWidth = ctx.measureText(this._options.text).width;
      const horzMargin = 20;
      let x = horzMargin;
      const width = scope.mediaSize.width;
      const height = scope.mediaSize.height;

      switch (this._options.horzAlign) {
        case 'middle':
          x = width / 2 - textWidth / 2;
          break;
        case 'right':
          x = width - horzMargin - textWidth;
          break;
      }

      const vertMargin = 10;
      const lineHeight = this._options.lineHeight;
      let y = vertMargin + lineHeight;

      switch (this._options.vertAlign) {
        case 'bottom':
          y = height - vertMargin;
          break;
        case 'middle':
          y = height / 2 + lineHeight / 2;
          break;
      }

      ctx.fillStyle = this._options.color;
      ctx.fillText(this._options.text, x, y);
    });
  }
}

/**
 * AnchoredPanePrimitive
 *
 * Pane-level primitive for displaying anchored text. Attached to panes via pane.attachPrimitive().
 */
export class AnchoredPanePrimitive implements IPanePrimitiveBase<
  PaneAttachedParameter<Time>
> {
  _options: AnchoredTextOptions;

  private _paneView: AnchoredTextPaneView;

  private _requestUpdate?: () => void;

  constructor(options: AnchoredTextOptions) {
    this._options = options;
    this._paneView = new AnchoredTextPaneView(this);
  }

  /**
   * Update the text options and request a redraw
   */
  applyOptions(options: Partial<AnchoredTextOptions>): void {
    this._options = { ...this._options, ...options };
    if (this._requestUpdate) {
      this._requestUpdate();
    }
  }

  attached({ requestUpdate }: PaneAttachedParameter<Time>): void {
    this._requestUpdate = requestUpdate;
  }

  detached(): void {
    this._requestUpdate = undefined;
  }

  paneViews(): readonly AnchoredTextPaneView[] {
    return [this._paneView];
  }

  updateAllViews(): void {
    // Trigger view update if needed
  }
}

/**
 * Default options for pane labels (matches legacy styling). Note: color is set dynamically in createPaneLabelPrimitive
 * using theme.
 */
const DEFAULT_PANE_LABEL_OPTIONS: Omit<AnchoredTextOptions, 'color'> = {
  font: 'italic bold 12px Arial',
  horzAlign: 'left',
  lineHeight: 12,
  text: '',
  vertAlign: 'top',
} as const;

/**
 * Create a pane primitive with default styling for labels. Uses theme-aware color from CSS variables.
 */
export function createPaneLabelPrimitive(text: string): AnchoredPanePrimitive {
  return new AnchoredPanePrimitive({
    ...DEFAULT_PANE_LABEL_OPTIONS,
    color: getPaneLabelColor(),
    text,
  });
}
