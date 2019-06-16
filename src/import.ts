import Vue from 'vue';
import ImportView from './components/Import.vue';

async function init() {
  new Vue({ render: h => h(ImportView) }).$mount('#import');

  // try {
  //   document.title = ui..i18n.extName;
  // } catch (e) {
  //   console.error(e);
  // }
}

init();
