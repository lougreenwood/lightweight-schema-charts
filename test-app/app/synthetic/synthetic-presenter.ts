import {
  AbstractDataStreamPresenter,
  validateSeriesNumber,
  validateSeriesOhlc,
} from '@lightweight-schema-charts/ember';
import type {
  BaseChartDataSample,
  BaseStructuralDescriptor,
  DataStreamIdentifier,
  ProjectedSeriesPoint,
  SeriesValueHandler,
  SeriesPath,
} from '@lightweight-schema-charts/ember';
import {
  SyntheticCandle,
  SyntheticProvider,
  streamIdentifier,
} from 'test-app/synthetic/synthetic-provider';
import { ok, type Result } from 'true-myth/result';

export const syntheticValueHandler: SeriesValueHandler = {
  id: 'wrapped-candle',
  priceFormat: {
    type: 'custom',
    minMove: 0.001,
    formatter: (value) => `${value.toFixed(3)} u`,
  },
  toNumber: validateSeriesNumber,
  toOhlc(value) {
    if (
      value &&
      typeof value === 'object' &&
      'candle' in value &&
      value.candle instanceof SyntheticCandle
    ) {
      return validateSeriesOhlc(value.candle);
    }
    return validateSeriesOhlc(value);
  },
};

function projectSyntheticValue({
  sample,
  fieldPath,
  rejectField,
}: {
  sample: BaseChartDataSample<object, object, DataStreamIdentifier>;
  fieldPath: SeriesPath;
  rejectField: SeriesPath | undefined;
}): unknown {
  if (rejectField === fieldPath) return 'rejected';
  if (fieldPath === 'data.close' && sample.data instanceof SyntheticCandle)
    return sample.data.close;
  return { candle: sample.data };
}

export class SyntheticPresenter extends AbstractDataStreamPresenter<
  SyntheticProvider,
  typeof streamIdentifier,
  SyntheticCandle[]
> {
  handlerId: string;
  streamName = 'Synthetic close';
  label = 'Candle';
  rejectField: SeriesPath | undefined;
  readonly includeScalar: boolean;
  readonly isConfigurable = false;

  constructor({
    dataProvider,
    handlerId,
    includeScalar = false,
  }: {
    dataProvider: SyntheticProvider;
    handlerId: string;
    includeScalar?: boolean;
  }) {
    super({ dataProvider, dataStreamIdentifier: streamIdentifier });
    this.handlerId = handlerId;
    this.includeScalar = includeScalar;
    this._initializeDescriptors();
  }

  configure({
    handlerId = this.handlerId,
    label = this.label,
  }: {
    handlerId?: string;
    label?: string;
  }): void {
    this.handlerId = handlerId;
    this.label = label;
    this.streamName = label;
    this._initializeDescriptors();
  }

  getStreamDataSource(): Result<SyntheticCandle[], never> {
    return ok(this.dataProvider.dataSource);
  }

  protected _describeDataFields(): ReadonlySet<
    BaseStructuralDescriptor<typeof streamIdentifier>
  > {
    return new Set([
      {
        identifier: {
          dataStreamIdentifier: streamIdentifier,
          fieldPath: 'data.candle',
        },
        kind: 'series',
        label: this.label,
        seriesKind: 'candlestick',
        valueHandler: this.handlerId,
      },
      ...(this.includeScalar
        ? ([
            {
              identifier: {
                dataStreamIdentifier: streamIdentifier,
                fieldPath: 'data.close',
              },
              kind: 'series' as const,
              label: 'Close',
              seriesKind: 'line' as const,
            },
          ] satisfies Array<BaseStructuralDescriptor<typeof streamIdentifier>>)
        : []),
    ]);
  }

  protected _describeMetaFieldChildren(): ReadonlySet<
    BaseStructuralDescriptor<typeof streamIdentifier>
  > {
    return new Set();
  }

  protected _projectFieldImplementation({
    dataSamples,
    fieldPath,
  }: {
    dataSamples: ReadonlySet<
      BaseChartDataSample<object, object, DataStreamIdentifier>
    >;
    fieldPath: SeriesPath;
  }): ReadonlySet<ProjectedSeriesPoint> {
    return new Set(
      dataSamples.values().map((sample) => ({
        time: sample.time,
        value: projectSyntheticValue({
          sample,
          fieldPath,
          rejectField: this.rejectField,
        }),
      }))
    );
  }
}
