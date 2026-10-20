import { pageTitle } from 'ember-page-title';

<template>
  {{pageTitle "Chart Kit Test App"}}

  <main>
    <h1>Chart Kit</h1>
    <p>The chart test harness will mount here.</p>
  </main>

  {{outlet}}
</template>
