import { lightweightSchemaChartsEmberPackage } from '@lightweight-schema-charts/ember';
import { module, test } from 'qunit';

module('addon package resolution', function () {
  test('resolves the Ember package by package name', function (assert) {
    assert.equal(
      lightweightSchemaChartsEmberPackage,
      '@lightweight-schema-charts/ember',
      'the package module resolved'
    );
  });
});
