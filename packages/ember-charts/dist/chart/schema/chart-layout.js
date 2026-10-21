import { tracked } from '@glimmer/tracking';
import { NotFoundError } from '../../vendor/shared-utils/errors/not-found-error.js';
import { err, ok } from 'true-myth/result';
import { g, i } from 'decorator-transforms/runtime-esm';

/**
 * ChartLayout
 *
 * Two-layer composition for chart layout state:
 *
 * Layer A — Derived Default (stateless, reactive): A `@cached` getter recomputed from the current providers'
 * `defaultLayout` fragments via a callback from the schema. New providers automatically appear because the callback
 * reads tracked provider state.
 *
 * Layer B — Persisted Overlay (stateful, user-modified): Stores ONLY entries where the user has changed something from
 * the default. Initially empty. Keyed by `groupId::fieldPath`.
 *
 * The public `.layout` getter merges both layers: overlay wins, stale overlay entries (no matching default) are
 * skipped.
 *
 * Reactivity: `#overlay` is @tracked. The `getDefaultLayout` callback reads tracked provider state upstream. Both
 * invalidation paths cause the merged `.layout` to recompute.
 */

class ChartLayout {
  /**
   * Merged layout: derived default + persisted overlay.
   *
   * Walks the derived default layout. For each series entry, checks the overlay — if an override exists, uses the
   * overlay's visibility; otherwise uses the default. Stale overlay entries (provider removed) are naturally skipped
   * because we iterate the default, not the overlay.
   */
  get layout() {
    const defaultLayout = this.#getDefaultLayout();
    const panes = defaultLayout.panes.map(pane => ({
      ...pane,
      seriesGroups: pane.seriesGroups.map(group => this.#applyOverlayToGroup({
        group
      }))
    }));
    return {
      panes
    };
  }
  get overlay() {
    const defaultLayout = this.#getDefaultLayout();
    return this._overlay.entries().map(([overlayKey, entry]) => {
      const {
        fieldPath,
        groupId
      } = this.#parseOverlayKey({
        overlayKey
      });
      const defaultSeries = this.#findSeriesInLayout({
        fieldPath,
        groupId,
        layout: defaultLayout
      });
      if (defaultSeries === undefined || defaultSeries.visible === entry.visible) {
        return undefined;
      }
      return {
        fieldPath,
        groupId,
        visible: entry.visible
      };
    }).filter(entry => entry !== undefined).toArray();
  }
  constructor({
    getDefaultLayout,
    initialOverlay,
    resolveGroupId
  }) {
    this.#getDefaultLayout = getDefaultLayout;
    this.#resolveGroupId = resolveGroupId;
    if (initialOverlay !== undefined) {
      this.replaceOverlay({
        overlay: initialOverlay
      });
    }
  }
  replaceOverlay({
    overlay
  }) {
    const defaultLayout = this.#getDefaultLayout();
    this._overlay = overlay.values().reduce((nextOverlay, entry) => {
      const defaultSeries = this.#findSeriesInLayout({
        fieldPath: entry.fieldPath,
        groupId: entry.groupId,
        layout: defaultLayout
      });
      if (defaultSeries === undefined || defaultSeries.visible === entry.visible) {
        return nextOverlay;
      }
      nextOverlay.set(this.#makeOverlayKey({
        fieldPath: entry.fieldPath,
        groupId: entry.groupId
      }), {
        visible: entry.visible
      });
      return nextOverlay;
    }, new Map());
  }

  /**
   * Toggle visibility of a specific series field.
   *
   * Resolves groupId from the dataStreamIdentifier via the injected resolver, verifies the field exists in the current
   * derived default layout, then promotes the toggled value into the overlay. If the resulting visibility matches the
   * default, the overlay entry is removed (cleanup).
   */
  toggleSeries({
    identifier: {
      dataStreamIdentifier,
      fieldPath
    }
  }) {
    const groupId = this.#resolveGroupId({
      dataStreamIdentifier
    });
    if (groupId === undefined) {
      return err(NotFoundError.of({
        errorCode: 'CHART_LAYOUT_PROVIDER_NOT_FOUND',
        message: `Cannot toggle series: no provider found for stream ${dataStreamIdentifier.id}`,
        meta: {
          dataStreamIdentifier
        }
      }));
    }

    // Find the field in the current derived default to determine default visibility
    const defaultLayout = this.#getDefaultLayout();
    const defaultSeries = this.#findSeriesInLayout({
      fieldPath,
      groupId,
      layout: defaultLayout
    });
    if (defaultSeries === undefined) {
      return err(NotFoundError.of({
        errorCode: 'CHART_LAYOUT_FIELD_NOT_FOUND',
        message: `Cannot toggle series: field '${fieldPath}' not found in layout for ${groupId}`,
        meta: {
          fieldPath,
          groupId
        }
      }));
    }
    const overlayKey = this.#makeOverlayKey({
      fieldPath,
      groupId
    });

    // Determine new visibility: check overlay first, fall back to default
    const currentOverlay = this._overlay.get(overlayKey);
    const currentVisible = currentOverlay !== undefined ? currentOverlay.visible : defaultSeries.visible;
    const newVisible = !currentVisible;

    // If toggled value matches default, remove from overlay (cleanup); otherwise store override
    const updatedOverlay = new Map(this._overlay);
    if (newVisible === defaultSeries.visible) {
      updatedOverlay.delete(overlayKey);
    } else {
      updatedOverlay.set(overlayKey, {
        visible: newVisible
      });
    }
    this._overlay = updatedOverlay;
    return ok(true);
  }
  static {
    g(this.prototype, "_overlay", [tracked], function () {
      return new Map();
    });
  }
  #_overlay = (i(this, "_overlay"), void 0);
  #getDefaultLayout;
  #resolveGroupId;

  /**
   * Apply overlay overrides to a single series group. Returns a new group with series visibility merged.
   */
  #applyOverlayToGroup({
    group
  }) {
    return {
      ...group,
      series: group.series.map(s => {
        const overlayKey = this.#makeOverlayKey({
          fieldPath: s.fieldPath,
          groupId: group.groupId
        });
        const override = this._overlay.get(overlayKey);
        return override !== undefined ? {
          ...s,
          visible: override.visible
        } : s;
      })
    };
  }

  /**
   * Find a series entry in a layout by groupId + fieldPath.
   */
  #findSeriesInLayout({
    fieldPath,
    groupId,
    layout
  }) {
    for (const pane of layout.panes) {
      for (const group of pane.seriesGroups) {
        if (group.groupId === groupId) {
          const series = group.series.find(s => s.fieldPath === fieldPath);
          if (series) return series;
        }
      }
    }
    return undefined;
  }

  /**
   * Build the overlay key for a series field.
   */
  #makeOverlayKey({
    fieldPath,
    groupId
  }) {
    return `${groupId}::${fieldPath}`;
  }
  #parseOverlayKey({
    overlayKey
  }) {
    const fieldPathStartIndex = overlayKey.indexOf('::data.');
    const metaFieldPathStartIndex = overlayKey.indexOf('::meta.');
    const splitIndex = fieldPathStartIndex >= 0 ? fieldPathStartIndex : metaFieldPathStartIndex;
    if (splitIndex < 0) {
      return {
        fieldPath: overlayKey,
        groupId: ''
      };
    }
    return {
      fieldPath: overlayKey.slice(splitIndex + 2),
      groupId: overlayKey.slice(0, splitIndex)
    };
  }
}

export { ChartLayout };
//# sourceMappingURL=chart-layout.js.map
