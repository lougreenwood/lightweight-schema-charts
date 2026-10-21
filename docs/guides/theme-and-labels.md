# Theme and labels

## Theme

Lightweight Charts renders to canvas, so it cannot use CSS custom properties directly. The package reads the computed values at chart creation and converts them to a form the library accepts.

Colors come from these root custom properties:

| Property | Used for |
| --- | --- |
| `--color-background` | Chart background |
| `--color-brand` | Accent, crosshair, active states |
| `--color-danger` | Negative or warning accents |
| `--color-divider` | Grid lines and borders |
| `--color-highlight-soft` | Subtle emphasis |

Series colors are derived from the same variables. To theme a chart, define these properties on the document root, or on any ancestor of the chart element. No package import is required.

### Reapplying after a theme change

The chart reads colors once, at creation. When the theme changes, call the `applyTheme` function handed to `onReady`:

```gts
<div
  {{ChartLwcAdapterModifier
    this.state
    this.registry
    this.domainContext
    onReady=this.handleReady
  }}
></div>
```

```ts
handleReady = ({ applyTheme }) => {
  this.applyTheme = applyTheme;
};
```

A theme observer in the host calls `applyTheme()` after the document class or custom properties change. The package does not observe the document itself; that stays a host responsibility.

## Labels

Titles are composed from provider name, stream name, and field path, with repeated segments removed so a label reads as a hierarchy without stuttering.

Examples of the reduction:

| Provider | Stream | Field | Result |
| --- | --- | --- | --- |
| Synthetic | Synthetic close | close | Synthetic close |
| Market data | Candles | close | Market data · Candles |

The first pane also receives a pane label. Labels are rebuilt when names change or when pane-level context changes; a label change alone does not rebuild series data.

### Domain context

The modifier takes a small context object:

| Member | Purpose |
| --- | --- |
| `marketDataDataSampleCount` | Initial sample count, used to decide the initial visible range |
| `timeframeLabel` | Human-readable interval, such as `1m` |
| `tradableAssetPairName` | Instrument display name |

These are display inputs only. Changing them refreshes labels and focus range; it does not refetch data.

## Checklist

- [ ] The five custom properties are defined above the chart element.
- [ ] `onReady` is used to retain `applyTheme` if the host supports theme switching.
- [ ] Provider and stream names read as human text.
- [ ] Domain context values are display strings, not identifiers.
