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

export class SyntheticPresenter extends AbstractDataStreamPresenter<
  SyntheticProvider,
  typeof streamIdentifier,
  SyntheticCandle[]
> {
  readonly handlerId: string;
  readonly streamName = 'Synthetic close';
  readonly isConfigurable = false;

  constructor({
    dataProvider,
    handlerId,
  }: {
    dataProvider: SyntheticProvider;
    handlerId: string;
  }) {
    super({ dataProvider, dataStreamIdentifier: streamIdentifier });
    this.handlerId = handlerId;
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
        label: 'Candle',
        seriesKind: 'candlestick',
        valueHandler: this.handlerId,
      },
    ]);
  }

  protected _describeMetaFieldChildren(): ReadonlySet<
    BaseStructuralDescriptor<typeof streamIdentifier>
  > {
    return new Set();
  }

  protected _projectFieldImplementation({
    dataSamples,
  }: {
    dataSamples: ReadonlySet<
      BaseChartDataSample<object, object, DataStreamIdentifier>
    >;
  }): ReadonlySet<ProjectedSeriesPoint> {
    return new Set(
      dataSamples.values().map((sample) => ({
        time: sample.time,
        value: { candle: sample.data },
      }))
    );
  }
}
