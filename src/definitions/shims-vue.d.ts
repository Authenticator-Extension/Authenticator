declare module "*.vue" {
  import Vue, { VueConstructor } from "vue";
  export default Vue;
}

declare module "*.svg" {
  import { ComponentOptions } from "vue";
  const a: ComponentOptions<any>;
  export default a;
}
