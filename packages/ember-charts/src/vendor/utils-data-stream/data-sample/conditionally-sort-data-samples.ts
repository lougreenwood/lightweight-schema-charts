import type { TimedSample } from '#src/vendor/utils-data-stream/data-sample/get-samples-since';

export type DataSampleSortDirection = 'ascending' | 'descending';

export function conditionallySortDataSamples<TSample extends TimedSample>({
  dataSamples,
  direction = 'ascending',
}: {
  dataSamples: Iterable<TSample>;
  direction?: DataSampleSortDirection;
}): ReadonlyArray<TSample> {
  const normalizedSamples = Array.from(dataSamples);

  if (normalizedSamples.length <= 1) {
    return normalizedSamples;
  }

  const firstSample = normalizedSamples[0];
  const lastSample = normalizedSamples.at(-1);

  if (firstSample === undefined || lastSample === undefined) {
    return normalizedSamples;
  }

  const firstTime = firstSample.time.getTime();
  const lastTime = lastSample.time.getTime();

  switch (direction) {
    case 'ascending':
      return firstTime <= lastTime
        ? normalizedSamples
        : normalizedSamples.toSorted(
            (left, right) => left.time.getTime() - right.time.getTime(),
          );
    case 'descending':
      return firstTime >= lastTime
        ? normalizedSamples
        : normalizedSamples.toSorted(
            (left, right) => right.time.getTime() - left.time.getTime(),
          );
  }
}
