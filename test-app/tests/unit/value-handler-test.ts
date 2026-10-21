import {
  SeriesAdapterRegistry,
  interpretProjectedPoints,
  validateSeriesNumber,
  validateSeriesOhlc,
} from '@lightweight-schema-charts/ember';
import type { SeriesValueHandler } from '@lightweight-schema-charts/ember';
import { module, test } from 'qunit';
import { ok } from 'true-myth/result';

const time = new Date('2024-01-01T00:00:00Z');
const handler: SeriesValueHandler = {
  id: 'structured',
  toNumber(value) {
    if (value && typeof value === 'object' && 'amount' in value)
      return validateSeriesNumber(value.amount);
    return validateSeriesNumber(value);
  },
  toOhlc(value) {
    if (
      value &&
      typeof value === 'object' &&
      'start' in value &&
      'peak' in value &&
      'floor' in value &&
      'finish' in value
    ) {
      return validateSeriesOhlc({
        open: value.start,
        high: value.peak,
        low: value.floor,
        close: value.finish,
      });
    }
    return validateSeriesOhlc(value);
  },
};

module('Unit | series value interpretation', function () {
  test('an absent handler selects validated numeric interpretation', function (assert) {
    new SeriesAdapterRegistry()
      .getValueHandler({ id: undefined })
      .andThen((selected) =>
        interpretProjectedPoints({
          handler: selected,
          points: new Set([{ time, value: 12.5 }]),
          seriesKind: 'line',
        })
      )
      .match({
        Ok: (points) =>
          assert.deepEqual(Array.from(points), [{ time, value: 12.5 }]),
        Err: (error) => assert.true(false, error.message),
      });
  });

  test('scalar dispatch uses series kind even if the input has an open property', function (assert) {
    interpretProjectedPoints({
      handler,
      points: new Set([{ time, value: { amount: 12.25, open: 99 } }]),
      seriesKind: 'line',
    }).match({
      Ok: (points) =>
        assert.deepEqual(Array.from(points), [{ time, value: 12.25 }]),
      Err: (error) => assert.true(false, error.message),
    });
  });

  test('OHLC dispatch accepts consumer structures without an open property', function (assert) {
    interpretProjectedPoints({
      handler,
      points: new Set([
        { time, value: { start: 4, peak: 6, floor: 3, finish: 5 } },
      ]),
      seriesKind: 'candlestick',
    }).match({
      Ok: (points) =>
        assert.deepEqual(Array.from(points), [
          { time, value: { open: 4, high: 6, low: 3, close: 5 } },
        ]),
      Err: (error) => assert.true(false, error.message),
    });
  });

  test('the built-in numeric handler resolves by its exported id', function (assert) {
    new SeriesAdapterRegistry()
      .getValueHandler({ id: 'numeric' })
      .andThen((selected) =>
        interpretProjectedPoints({
          handler: selected,
          points: new Set([{ time, value: 3.5 }]),
          seriesKind: 'line',
        })
      )
      .match({
        Ok: (points) =>
          assert.deepEqual(Array.from(points), [{ time, value: 3.5 }]),
        Err: (error) => assert.true(false, error.message),
      });
  });

  test('unknown named handlers are typed lookup failures', function (assert) {
    new SeriesAdapterRegistry().getValueHandler({ id: 'unknown' }).match({
      Ok: () =>
        assert.true(false, 'unknown names must not use the numeric default'),
      Err: (error) => {
        assert.strictEqual(error.errorCode, 'SERIES_VALUE_HANDLER_NOT_FOUND');
        assert.deepEqual(error.meta, { handlerId: 'unknown' });
      },
    });
  });

  test('non-finite output is rejected even if a plugin reports success', function (assert) {
    const invalid: SeriesValueHandler = {
      id: 'invalid',
      toNumber: () => ok(Number.NaN),
    };
    interpretProjectedPoints({
      handler: invalid,
      points: new Set([{ time, value: 'input' }]),
      seriesKind: 'line',
    }).match({
      Ok: () =>
        assert.true(false, 'non-finite output must not reach an adapter'),
      Err: (error) =>
        assert.strictEqual(error.errorCode, 'SERIES_VALUE_NUMBER_INVALID'),
    });
  });

  test('an OHLC series requires an OHLC converter', function (assert) {
    const scalar: SeriesValueHandler = {
      id: 'scalar',
      toNumber: validateSeriesNumber,
    };
    interpretProjectedPoints({
      handler: scalar,
      points: new Set([{ time, value: 5 }]),
      seriesKind: 'bar',
    }).match({
      Ok: () =>
        assert.true(false, 'scalar conversion must not stand in for OHLC'),
      Err: (error) =>
        assert.strictEqual(
          error.errorCode,
          'SERIES_VALUE_OHLC_CONVERTER_MISSING'
        ),
    });
  });

  test('the numeric default does not unwrap domain objects', function (assert) {
    new SeriesAdapterRegistry()
      .getValueHandler({ id: undefined })
      .andThen((selected) =>
        interpretProjectedPoints({
          handler: selected,
          points: new Set([{ time, value: { amount: 5 } }]),
          seriesKind: 'line',
        })
      )
      .match({
        Ok: () => assert.true(false, 'domain values need an explicit handler'),
        Err: (error) =>
          assert.strictEqual(error.errorCode, 'SERIES_VALUE_NUMBER_INVALID'),
      });
  });
});
