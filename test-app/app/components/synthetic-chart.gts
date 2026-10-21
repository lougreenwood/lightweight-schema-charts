import Component from '@glimmer/component';
import { on } from '@ember/modifier';
import { tracked } from '@glimmer/tracking';
import { ChartLwcAdapterModifier } from '@lightweight-schema-charts/ember';
import type { SeriesValueFailure } from '@lightweight-schema-charts/ember';
import type { IChartApi } from 'lightweight-charts';
import { createSyntheticChart } from 'test-app/synthetic/synthetic-chart';

export default class SyntheticChart extends Component {
  @tracked chart = createSyntheticChart({ candleCount: 120 });
  @tracked inspected = '';
  @tracked lastError = '';
  #chartApi: IChartApi | undefined;
  #seriesRef: unknown;

  handleReady = ({ chart }: { chart: IChartApi }): void => {
    this.#chartApi = chart;
  };
  handleError = ({ error }: SeriesValueFailure): void => {
    this.lastError = error.errorCode;
  };

  update = (): void => {
    this.chart.append();
  };

  inspect = (): void => {
    const series = this.#chartApi?.panes()[0]?.getSeries()[0];
    if (series === undefined) return;
    const identity =
      this.#seriesRef === undefined
        ? 'initial'
        : this.#seriesRef === series
          ? 'same'
          : 'new';
    this.#seriesRef = series;
    this.inspected = JSON.stringify({
      count: series.data().length,
      identity,
      last: series.data().at(-1),
      formatted: series.priceFormatter().format(123.456),
      minMove: series.options().priceFormat.minMove,
    });
  };

  selectMissingHandler = (): void => {
    this.chart = createSyntheticChart({
      candleCount: 120,
      handlerId: 'missing',
    });
  };

  <template>
    <div
      style="height: 420px; width: 100%"
      {{ChartLwcAdapterModifier
        this.chart.state
        this.chart.registry
        this.chart.domainContext
        onReady=this.handleReady
        onError=this.handleError
      }}
    ></div>
    <span data-test-panes>{{this.chart.state.panes.length}}</span>
    <button
      type="button"
      data-test-update
      {{on "click" this.update}}
    >update</button>
    <button
      type="button"
      data-test-inspect
      {{on "click" this.inspect}}
    >inspect</button>
    <button
      type="button"
      data-test-missing-handler
      {{on "click" this.selectMissingHandler}}
    >missing handler</button>
    <output data-test-series>{{this.inspected}}</output>
    <output data-test-error>{{this.lastError}}</output>
  </template>
}
