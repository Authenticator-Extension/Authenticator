/* tslint:disable:no-reference */
/// <reference path="../models/interface.ts" />

// need to find a better way to handle Vue types without modules
// we use vue 1.0 here to solve csp issues
/* tslint:disable-next-line:no-any */
declare var Vue: any;

class UI {
  private ui: UIConfig;
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

  generate() {
    this.instance = new Vue(this.ui);
    return this.instance;
  }
}