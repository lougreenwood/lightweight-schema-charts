import { render, settled, waitUntil } from '@ember/test-helpers';
import { htmlSafe } from '@ember/template';
import { ChartLwcAdapterModifier } from '@lightweight-schema-charts/ember';
import type {
  DataProviderLike,
  DataStreamPresenterLike,
  DataStreamIdentifier,
} from '@lightweight-schema-charts/ember';
import { module, test } from 'qunit';
import { createSyntheticChart } from 'test-app/synthetic/synthetic-chart';
import { setupRenderingTest } from 'test-app/tests/helpers';
import type { ChartTestContext } from 'test-app/tests/integration/reconciliation-test/types';

// rAF is outside Ember's settled state. Flush two frames because a reconciliation can schedule a fresh callback while
// the first is running. Never wait for a mutation-sensitive success predicate.
async function reconcile(): Promise<void> {
  await settled();
  await new Promise<void>((resolve) =>
    globalThis.requestAnimationFrame(() => resolve())
  );
  await new Promise<void>((resolve) =>
    globalThis.requestAnimationFrame(() => resolve())
  );
  await settled();
}

function renderChart(this: ChartTestContext): Promise<void> {
  return render<ChartTestContext>(
    <template>
      <div
        data-test-chart
        style={{this.hostStyle}}
        {{ChartLwcAdapterModifier
          this.state
          this.registry
          this.domainContext
          onReady=this.captureReady
          onError=this.captureFailure
        }}
      ></div>
    </template>
  );
}

module('Integration | chart reconciliation', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function (this: ChartTestContext) {
    this.model = createSyntheticChart({ candleCount: 3, includeScalar: true });
    this.state = this.model.state;
    this.registry = this.model.registry;
    this.domainContext = this.model.domainContext;
    this.api = undefined;
    this.failures = [];
    this.hostStyle = htmlSafe('height: 420px; width: 640px');
    this.focusRanges = [];
    this.captureReady = ({ chart }) => {
      this.api = chart;
      const timeScale = chart.timeScale();
      const setRange = timeScale.setVisibleLogicalRange.bind(timeScale);
      timeScale.setVisibleLogicalRange = (range) => {
        this.focusRanges.push(range);
        setRange(range);
      };
    };
    this.captureFailure = (failure) => {
      this.failures.push(failure);
    };
  });

  test('missing adapters notify once until registry replacement', async function (this: ChartTestContext, assert) {
    const model = createSyntheticChart({
      candleCount: 3,
      missingAdapters: ['candlestick'],
    });
    this.setProperties({ state: model.state, registry: model.registry });
    await renderChart.call(this);
    await reconcile();
    assert.strictEqual(
      this.failures[0]?.error.errorCode,
      'NO_SERIES_ADAPTER_FOR_TYPE',
      'the consumer sees the typed adapter failure'
    );
    assert.strictEqual(
      this.failures[0]?.fieldPath,
      'data.candle',
      'the notification names the field'
    );
    const attempts = model.registry.lookupCount;
    const fetches = model.provider.fetchCount;
    model.provider.append();
    this.set('state', model.state);
    await reconcile();
    model.provider.name = 'Renamed';
    this.set('state', model.state);
    await reconcile();
    assert.strictEqual(
      model.registry.lookupCount,
      attempts,
      'data and name changes do not retry a missing adapter'
    );
    assert.strictEqual(
      model.provider.fetchCount,
      fetches,
      'terminal groups do not refetch'
    );
    assert.strictEqual(
      this.failures.length,
      1,
      'unchanged configuration does not repeat notification'
    );
    this.set('registry', this.model.registry);
    await reconcile();
    assert.strictEqual(
      this.api?.panes()[0]?.getSeries()[0]?.data().length,
      5,
      'registry replacement recovers with full history'
    );
  });

  test('terminal adapter state resets for visible configuration and group removal', async function (this: ChartTestContext, assert) {
    const model = createSyntheticChart({
      candleCount: 3,
      missingAdapters: ['candlestick'],
    });
    this.setProperties({ state: model.state, registry: model.registry });
    await renderChart.call(this);
    await reconcile();
    const group = model.state.panes[0]!.seriesGroups[0]!;
    this.set('state', {
      panes: [
        {
          seriesGroups: [
            {
              ...group,
              series: [{ fieldPath: 'data.candle', visible: false }],
            },
          ],
        },
      ],
    });
    await reconcile();
    this.set('state', model.state);
    await reconcile();
    assert.strictEqual(
      this.failures.length,
      2,
      'showing the blocked field attempts its changed configuration'
    );
    this.set('state', { panes: [] });
    await reconcile();
    this.set('state', model.state);
    await reconcile();
    assert.strictEqual(
      this.failures.length,
      3,
      'a readded group gets a fresh attempt'
    );
  });

  test('failed initial groups contain no partial series and recover', async function (this: ChartTestContext, assert) {
    this.model.presenter.rejectField = 'data.close';
    await renderChart.call(this);
    await reconcile();
    assert.strictEqual(
      this.api?.panes()[0]?.getSeries().length,
      0,
      'failure in the second field rolls back the first'
    );
    assert.strictEqual(
      this.failures[0]?.error.errorCode,
      'SERIES_VALUE_NUMBER_INVALID',
      'the rejected value reaches the consumer'
    );
    this.model.presenter.rejectField = undefined;
    this.model.provider.refresh();
    this.set('state', this.model.state);
    await reconcile();
    assert.deepEqual(
      this.api
        ?.panes()[0]
        ?.getSeries()
        .map((series) => series.data().length),
      [3, 3],
      'the transient failure recovers every field'
    );
  });

  test('incremental value rejection is atomic and retries the whole group', async function (this: ChartTestContext, assert) {
    await renderChart.call(this);
    await reconcile();
    const series = this.api?.panes()[0]?.getSeries() ?? [];
    this.model.presenter.rejectField = 'data.close';
    this.model.provider.append();
    this.set('state', this.model.state);
    await reconcile();
    assert.deepEqual(
      series.map((field) => field.data().length),
      [3, 3],
      'a second-field failure cannot advance the first'
    );
    this.model.presenter.rejectField = undefined;
    this.model.provider.refresh();
    this.set('state', this.model.state);
    await reconcile();
    const recovered = this.api?.panes()[0]?.getSeries() ?? [];
    assert.deepEqual(
      recovered.map((field) => field.data().length),
      [5, 5],
      'retry backfills every missed point'
    );
    assert.notStrictEqual(
      recovered[0],
      series[0],
      'recovery replaces the old group only after validation'
    );
  });

  test('fetch failure preserves history and later backfills missed points', async function (this: ChartTestContext, assert) {
    await renderChart.call(this);
    await reconcile();
    const previous = this.api?.panes()[0]?.getSeries()[0];
    this.model.provider.failFetch = true;
    this.model.provider.append();
    this.set('state', this.model.state);
    await reconcile();
    assert.strictEqual(
      previous?.data().length,
      3,
      'failed fetch leaves history intact'
    );
    this.model.provider.failFetch = false;
    this.model.provider.refresh();
    this.set('state', this.model.state);
    await reconcile();
    assert.strictEqual(
      this.api?.panes()[0]?.getSeries()[0]?.data().length,
      5,
      'full backfill recovers the missed update'
    );
    assert.notStrictEqual(
      this.api?.panes()[0]?.getSeries()[0],
      previous,
      'retry is not an unsafe incremental replay'
    );
  });

  test('rename stays in place and a rejected rebuild preserves history', async function (this: ChartTestContext, assert) {
    await renderChart.call(this);
    await reconcile();
    const previous = this.api?.panes()[0]?.getSeries()[0];
    this.model.presenter.configure({ label: 'Renamed candle' });
    this.set('state', this.model.state);
    await reconcile();
    assert.strictEqual(
      this.api?.panes()[0]?.getSeries()[0],
      previous,
      'rename preserves the series handle'
    );
    assert.strictEqual(
      previous?.options().title,
      'Renamed candle',
      'the title changes in place'
    );
    this.model.presenter.rejectField = 'data.close';
    this.model.provider.projectionId = 'rebuilt';
    this.set('state', this.model.state);
    await reconcile();
    assert.strictEqual(
      this.api?.panes()[0]?.getSeries()[0],
      previous,
      'rejected rebuild preserves the old group'
    );
    assert.strictEqual(
      previous?.data().length,
      3,
      'rejected replacement keeps history'
    );
    this.model.presenter.rejectField = undefined;
    this.model.provider.refresh();
    this.set('state', this.model.state);
    await reconcile();
    assert.notStrictEqual(
      this.api?.panes()[0]?.getSeries()[0],
      previous,
      'a later successful rebuild replaces the group'
    );
  });

  test('visibility removes and restores only the selected field', async function (this: ChartTestContext, assert) {
    await renderChart.call(this);
    await reconcile();
    const group = this.model.state.panes[0]!.seriesGroups[0]!;
    this.set('state', {
      panes: [
        {
          seriesGroups: [
            {
              ...group,
              series: group.series.map((field) => ({
                ...field,
                visible: field.fieldPath !== 'data.close',
              })),
            },
          ],
        },
      ],
    });
    await reconcile();
    assert.strictEqual(
      this.api?.panes()[0]?.getSeries().length,
      1,
      'the hidden field is removed'
    );
    this.set('state', this.model.state);
    await reconcile();
    assert.deepEqual(
      this.api
        ?.panes()[0]
        ?.getSeries()
        .map((field) => field.data().length),
      [3, 3],
      'restoring visibility backfills both fields'
    );
  });

  test('multiple panes survive removal and readdition without misrouting updates', async function (this: ChartTestContext, assert) {
    const first = this.model.state.panes[0]!.seriesGroups[0]!;
    const second = {
      ...first,
      groupId: 'second',
      series: [{ fieldPath: 'data.close', visible: true }],
    };
    this.set('state', {
      panes: [{ seriesGroups: [first] }, { seriesGroups: [second] }],
    });
    await renderChart.call(this);
    await reconcile();
    assert.deepEqual(
      this.api?.panes().map((pane) => pane.getSeries().length),
      [2, 1],
      'each group has the requested pane'
    );
    this.set('state', { panes: [{ seriesGroups: [second] }] });
    await reconcile();
    this.model.provider.append();
    const updated = this.model.state.panes[0]!.seriesGroups[0]!;
    this.set('state', {
      panes: [
        { seriesGroups: [{ ...second, dataState: updated.dataState }] },
        { seriesGroups: [updated] },
      ],
    });
    await reconcile();
    assert.deepEqual(
      this.api
        ?.panes()
        .map((pane) => pane.getSeries().map((series) => series.data().length)),
      [[5], [5, 5]],
      'remaining and readded groups use current pane indices'
    );
  });

  test('zero-size hosts recover through automatic sizing without recreating the chart', async function (this: ChartTestContext, assert) {
    this.hostStyle = htmlSafe('height: 0px; width: 0px; overflow: hidden');
    await renderChart.call(this);
    await reconcile();
    const chart = this.api;
    assert.true(chart?.autoSizeActive(), 'automatic sizing owns recovery');
    assert.strictEqual(
      chart?.panes()[0]?.getSeries()[0]?.data().length,
      3,
      'zero-size hosts still receive data'
    );
    this.set('hostStyle', htmlSafe('height: 420px; width: 640px'));
    await waitUntil(
      () =>
        chart?.timeScale().width() !== undefined &&
        chart.timeScale().width() > 0
    );
    assert.strictEqual(this.api, chart, 'revealing the host reuses the chart');
    assert.true(
      (chart?.panes()[0]?.getHeight() ?? 0) > 0,
      'the pane grows when the host becomes visible'
    );
    assert.deepEqual(
      this.failures,
      [],
      'a zero-size host is not a render failure'
    );
  });

  test('empty providers focus only after data arrives and satisfy public contracts', async function (this: ChartTestContext, assert) {
    const model = createSyntheticChart({ candleCount: 0 });
    const provider: DataProviderLike = model.provider;
    const presenter: DataStreamPresenterLike<
      DataProviderLike,
      DataStreamIdentifier
    > = model.presenter;
    assert.strictEqual(
      presenter.providerName,
      provider.name,
      'public contracts preserve provider naming'
    );
    this.setProperties({
      state: model.state,
      registry: model.registry,
      domainContext: model.domainContext,
    });
    await renderChart.call(this);
    await reconcile();
    assert.deepEqual(
      this.focusRanges,
      [],
      'no initial focus is applied to an empty provider'
    );
    model.provider.append();
    this.setProperties({
      state: model.state,
      domainContext: model.domainContext,
    });
    await reconcile();
    assert.strictEqual(
      this.api?.panes()[0]?.getSeries()[0]?.data().length,
      2,
      'empty-to-populated performs a full backfill'
    );
    provider
      .getDataSince({ dataStreamIdentifier: presenter.dataStreamIdentifier })
      .match({
        Err: (error) => assert.false(true, error.errorCode),
        Ok: (batch) => {
          assert.strictEqual(
            batch.updates.size,
            2,
            'the public provider returns canonical updates'
          );
          batch.updates.forEach(({ data }) => {
            assert.strictEqual(
              data.dataProviderIdentifier,
              provider.identifier,
              'samples carry their provider identity'
            );
            assert.strictEqual(
              data.dataStreamIdentifier,
              presenter.dataStreamIdentifier,
              'samples carry their stream identity'
            );
          });
        },
      });
    assert.deepEqual(
      presenter.defaultSeries.values().toArray(),
      ['data.candle'],
      'public defaults select declared field paths'
    );
    assert.deepEqual(
      this.focusRanges,
      [{ from: 0, to: 1 }],
      'focus waits for the first actual samples'
    );
  });
});
