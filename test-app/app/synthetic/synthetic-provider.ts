import { tracked } from '@glimmer/tracking';
import { AbstractDataProvider } from '@lightweight-schema-charts/ember';
import type { DataProviderLike } from '@lightweight-schema-charts/ember';
import { ok, type Result } from 'true-myth/result';

export const providerIdentifier = {
  id: 'synthetic',
  type: 'synthetic',
} as const;
export const streamIdentifier = {
  dataProviderIdentifier: providerIdentifier,
  id: 'candle',
  type: 'candlestick',
} as const;

export class SyntheticCandle {
  readonly close: number;
  readonly high: number;
  readonly low: number;
  readonly open: number;
  readonly time: Date;

  constructor({ index }: { index: number }) {
    this.close = 101 + index;
    this.high = 102 + index;
    this.low = 98 + index;
    this.open = 100 + index;
    this.time = new Date(Date.UTC(2024, 0, 1, 0, index));
  }
}

export type SyntheticProviderContext = {
  candles: SyntheticCandle[];
  projectionId: string;
};

export class SyntheticProvider extends AbstractDataProvider<
  typeof SyntheticProvider,
  SyntheticProviderContext
> {
  static readonly dataSampleSource = SyntheticCandle;
  static readonly dataStreamIdentifiers = new Set([streamIdentifier]);
  readonly name = 'Synthetic';
  readonly projectionId: string;
  protected readonly staticSide = SyntheticProvider;
  @tracked private revision = 0;

  constructor({
    candles,
    projectionId,
  }: {
    candles: SyntheticCandle[];
    projectionId: string;
  }) {
    super({ dataSource: candles, identifier: providerIdentifier });
    this.projectionId = projectionId;
  }

  static create({
    context,
  }: {
    context: { candles: SyntheticCandle[]; projectionId: string };
  }): Result<SyntheticProvider, never> {
    return ok(new SyntheticProvider(context));
  }

  static discoverIdentifiers(): ReadonlySet<typeof providerIdentifier> {
    return new Set([providerIdentifier]);
  }

  static getDataSource({
    context,
  }: {
    context: { candles: SyntheticCandle[] };
  }): Result<SyntheticCandle[], never> {
    return ok(context.candles);
  }

  append(): void {
    const index = this.dataSource.length;
    this.dataSource.push(
      new SyntheticCandle({ index }),
      new SyntheticCandle({ index: index + 1 })
    );
    this.revision += 1;
  }

  override getDataState(): ReturnType<DataProviderLike['getDataState']> {
    void this.revision;
    const last = this.dataSource.at(-1);
    return {
      cursor: last === undefined ? undefined : { time: last.time.getTime() },
      dataHash: undefined,
      dataLength: this.dataSource.length,
      projectionId: this.projectionId,
    };
  }

  protected override _dataSampleSourceRecordsSince({
    sinceDate,
  }: {
    sinceDate?: Date;
  }): Iterable<SyntheticCandle> {
    return this.dataSource.filter(
      (candle) =>
        sinceDate === undefined || candle.time.getTime() >= sinceDate.getTime()
    );
  }

  protected override _dataSampleSourceAdapter({
    dataSampleSource,
  }: {
    dataSampleSource: SyntheticCandle;
  }) {
    return {
      data: dataSampleSource,
      meta: {},
      time: dataSampleSource.time,
      window: {
        close: dataSampleSource.time,
        open: dataSampleSource.time,
      },
    };
  }
}
