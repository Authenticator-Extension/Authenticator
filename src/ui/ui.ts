/* tslint:disable:ban-ts-ignore */
import Vue, { Component } from 'vue';
// @ts-ignore
import { OTPEntry } from '../models/otp';

export class UI {
  private ui: UIConfig;
  private modules: Array<(ui: UI) => void> = [];
  /* tslint:disable-next-line:no-any */
  private componenet: any;
  // Vue instance
  /* tslint:disable-next-line:no-any */
  instance: any;

  /* tslint:disable-next-line:no-any */
  constructor(componenet: any, ui: UIConfig) {
    this.ui = ui;
    this.componenet = Vue.extend(componenet);
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

    this.ui.mounted = () => {
      // @ts-ignore
      Vue.$dragula.$service.eventBus.$on('drop', async () => {
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

    this.instance = new this.componenet(this.ui);

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
