import { click, currentURL, visit } from '@ember/test-helpers';
import { setupApplicationTest } from 'test-app/tests/helpers';
import { module, test } from 'qunit';

module('Acceptance | synthetic chart', function (hooks) {
  setupApplicationTest(hooks);

  test('mounts, updates and tears down', async function (assert) {
    await visit('/chart');
    assert.strictEqual(currentURL(), '/chart', 'route renders');
    assert.dom('[data-test-panes]').hasText('1', 'schema produces one pane');
    assert.dom('canvas').exists('chart creates a canvas');

    await click('button');
    assert.dom('canvas').exists('chart survives a data update');

    await visit('/');
    assert.dom('canvas').doesNotExist('chart is destroyed on teardown');
  });
});
