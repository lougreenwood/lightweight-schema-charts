import { click, currentURL, visit, waitUntil } from '@ember/test-helpers';
import { setupApplicationTest } from 'test-app/tests/helpers';
import { module, test } from 'qunit';

module('Acceptance | synthetic chart', function (hooks) {
  setupApplicationTest(hooks);

  test('mounts, updates and tears down', async function (assert) {
    await visit('/chart');
    assert.strictEqual(currentURL(), '/chart', 'route renders');
    assert
      .dom('[data-test-error]')
      .hasText('', 'the initial render reports no handler failure');
    assert.dom('[data-test-panes]').hasText('1', 'schema produces one pane');
    assert.dom('canvas').exists('chart creates a canvas');

    await click('[data-test-inspect]');
    assert
      .dom('[data-test-series]')
      .includesText('"count":120', 'the initial backfill reaches the series');
    assert
      .dom('[data-test-series]')
      .includesText(
        '"close":220',
        'the handler converts wrapped candle values'
      );
    assert
      .dom('[data-test-series]')
      .includesText(
        '"formatted":"123.456 u"',
        'the custom formatter reaches the series'
      );
    assert
      .dom('[data-test-series]')
      .includesText(
        '"minMove":0.001',
        'the custom precision reaches the series'
      );

    await click('[data-test-update]');
    assert.dom('canvas').exists('chart survives a data update');
    await click('[data-test-inspect]');
    assert
      .dom('[data-test-series]')
      .includesText(
        '"identity":"same"',
        'the incremental update reuses the existing series'
      );
    assert
      .dom('[data-test-series]')
      .includesText('"count":122', 'incremental points reach the same series');
    assert
      .dom('[data-test-series]')
      .includesText(
        '"close":222',
        'incremental values pass through the handler'
      );

    await click('[data-test-missing-handler]');
    await waitUntil(
      () =>
        document.querySelector('[data-test-error]')?.textContent ===
        'SERIES_VALUE_HANDLER_NOT_FOUND',
      {
        timeoutMessage:
          'an unknown handler reaches the consumer error callback',
      }
    );
    assert
      .dom('[data-test-error]')
      .hasText(
        'SERIES_VALUE_HANDLER_NOT_FOUND',
        'an unknown handler reaches the consumer error callback'
      );

    await visit('/');
    assert
      .dom('canvas')
      .doesNotExist('chart is removed from the DOM on teardown');
  });
});
