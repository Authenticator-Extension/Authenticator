interface UIConfig {
    el?: string;
    data?: {
      /* tslint:disable-next-line:no-any */
      [name: string]: any
    };
    methods?: {
      /* tslint:disable-next-line:no-any */
      [name: string]: (...arg: any[]) => any
    };
    /* tslint:disable-next-line:no-any */
    mounted?: (...arg: any[]) => any;
    /* tslint:disable-next-line:no-any */
    beforeCreate?: (...arg: any[]) => any;
    /* tslint:disable-next-line:no-any */
    render?: (h: any) => any;
    /* tslint:disable-next-line:no-any */
  }
  