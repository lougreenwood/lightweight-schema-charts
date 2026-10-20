import { chartKitEmberPackage } from '@chart-kit/ember';
import { module, test } from 'qunit';

module('addon package resolution', function () {
  test('resolves the Ember package by package name', function (assert) {
    assert.equal(
      chartKitEmberPackage,
      '@chart-kit/ember',
      'the package module resolved'
    );
  });
});
