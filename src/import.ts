import {entry} from './ui/entry';
import {i18n} from './ui/i18n';
import {UI} from './ui/ui';
// @ts-ignore
import ImportView from './view/import';

async function init() {
  const ui = new UI(ImportView, {el: '#import'});

  const vm = await ui.load(i18n).load(entry).render();

  try {
    document.title = ui.instance.i18n.extName;
  } catch (e) {
    console.error(e);
  }
}

init();
