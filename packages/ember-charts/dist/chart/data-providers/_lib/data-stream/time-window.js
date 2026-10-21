/**
 * Shared embedded TimeWindow schema for DataSamples.
 *
 * ObjectSchema (not a resource) - uses `identity: null` for referential identity.
 */
const TimeWindowSchema = {
  identity: null,
  type: 'time-window',
  fields: [{
    kind: 'field',
    name: 'open',
    type: 'date'
  }, {
    kind: 'field',
    name: 'close',
    type: 'date'
  }]
};
const TimeWindowUnboundedSchema = {
  identity: null,
  type: 'time-window-unbounded',
  fields: [{
    kind: 'field',
    name: 'open',
    type: 'date'
  }, {
    kind: 'field',
    name: 'close',
    type: 'optional-date'
  }]
};
const schemas = [TimeWindowSchema, TimeWindowUnboundedSchema];

export { TimeWindowSchema, TimeWindowUnboundedSchema, schemas };
//# sourceMappingURL=time-window.js.map
