/* tslint:disable:no-reference */
/// <reference path="../models/interface.ts" />

// need to find a better way to handle Vue types without modules
// we use vue 1.0 here to solve csp issues
/* tslint:disable-next-line:no-any */
declare var Vue: any;

/* tslint:disable-next-line:no-any */
declare var vueDragula: any;

class UI {
  private ui: UIConfig;
  private modules: Array<(ui: UI) => void> = [];
  // Vue instance
  /* tslint:disable-next-line:no-any */
  instance: any;

  constructor(ui: UIConfig) {
    this.ui = ui;
  }

  update(ui: UIConfig) {
    if (ui.data) {
      this.ui.data = this.ui.data || {};
      for (const key of Object.keys(ui.data)) {
        this.ui.data[key] = ui.data[key];
      }
    }

    if (ui.methods) {
      this.ui.methods = this.ui.methods || {};
      for (const key of Object.keys(ui.methods)) {
        this.ui.methods[key] = ui.methods[key];
      }
    }
  }

  load(module: (ui: UI) => void) {
    this.modules.push(module);
    return this;
  }

  async render() {
    for (let i = 0; i < this.modules.length; i++) {
      await this.modules[i](this);
    }
    Vue.use(vueDragula);
    this.ui.ready = () => {
      Vue.vueDragula.eventBus.$on('drop', async () => {
        // wait for this.instance.entries sync from dom
        setTimeout(async () => {
          let needUpdate = false;
          for (let i = 0; i < this.instance.entries.length; i++) {
            const entry: OTPEntry = this.instance.entries[i];
            if (entry.index !== i) {
              needUpdate = true;
              entry.index = i;
            }
          }

          if (needUpdate) {
            await this.instance.updateStorage();
          }
          return;
        }, 0);
        return;
      });
    };

    this.instance = new Vue(this.ui);

    // wait for all modules loaded
    setTimeout(() => {
      this.instance.updateCode();
      setInterval(async () => {
        await this.instance.updateCode();
      }, 1000);
    }, 0);

    return this.instance;
  }
}
