import Component from '@glimmer/component';
import { on } from '@ember/modifier';
import { tracked } from '@glimmer/tracking';
import { ChartLwcAdapterModifier } from '@lightweight-schema-charts/ember';
import { createSyntheticChart } from 'test-app/synthetic/synthetic-chart';

export default class SyntheticChart extends Component {
  @tracked candleCount = 3;

  get chart() {
    return createSyntheticChart({ candleCount: this.candleCount });
  }

  update = (): void => {
    this.candleCount += 2;
  };

  <template>
    <div
      style="height: 320px; width: 640px"
      {{ChartLwcAdapterModifier
        this.chart.state
        this.chart.registry
        this.chart.domainContext
      }}
    ></div>
    <span data-test-panes>{{this.chart.state.panes.length}}</span>
    <button type="button" {{on "click" this.update}}>update</button>
  </template>
}
