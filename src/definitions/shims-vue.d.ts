/* eslint-disable @typescript-eslint/no-explicit-any */
declare module "*.vue" {
  import { DefineComponent } from "vue";
  const component: DefineComponent<
    Record<string, never>,
    Record<string, never>,
    any
  >;
  export default component;
}

declare module "*.svg" {
  import { DefineComponent } from "vue";
  const component: DefineComponent<
    Record<string, never>,
    Record<string, never>,
    any
  >;
  export default component;
}
