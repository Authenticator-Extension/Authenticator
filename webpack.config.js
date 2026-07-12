const path = require("path");
const webpack = require("webpack");
const { VueLoaderPlugin } = require("vue-loader");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");

module.exports = {
  mode: "development",
  devtool: "source-map",
  entry: {
    argon: "./src/argon.ts",
    background: "./src/background.ts",
    content: "./src/content.ts",
    popup: "./src/popup.ts",
    import: "./src/import.ts",
    options: "./src/options.ts",
    qrdebug: "./src/qrdebug.ts",
    permissions: "./src/permissions.ts",
  },
  module: {
    rules: [
      {
        // argon2-browser overrides.
        // argon2-browser's decodeWasmBinary() calls atob() directly on this
        // module's default export, so it must be a raw base64 string — NOT
        // a data URI. The default asset/inline generator would emit
        // "data:application/wasm;base64,...", which atob() would decode
        // literally and corrupt the wasm binary. This custom generator
        // reproduces base64-loader's exact output format.
        //
        // Note: the old `module.noParse: /\.wasm$/` (needed by base64-loader
        // to skip scanning its generated JS for requires) is intentionally
        // NOT carried over here — with asset modules it does more than skip
        // parsing: it was empirically verified (isolated webpack repro) to
        // make webpack silently fall back to asset/resource codegen
        // (`__webpack_require__.p + filename`, a separate emitted .wasm
        // file + URL string) instead of running this dataUrl generator at
        // all, breaking decodeWasmBinary's atob() call at runtime.
        test: /\.wasm$/,
        type: "asset/inline",
        generator: {
          dataUrl: (content) => content.toString("base64"),
        },
      },
      {
        test: /\.tsx?$/,
        loader: "ts-loader",
        options: {
          appendTsSuffixTo: [/\.vue$/],
          transpileOnly: true,
        },
        exclude: /node_modules/,
      },
      {
        test: /\.vue$/,
        loader: "vue-loader",
      },
      {
        test: /\.svg$/,
        use: [
          "vue-loader",
          path.resolve(__dirname, "webpack-loaders/vue-svg-loader.js"),
        ],
      },
      {
        // url-loader with no `limit` option defaults to inlining every
        // matched file as a base64 data URL regardless of size (never
        // falls back to a separate emitted file); asset/inline reproduces
        // that exact behavior with webpack 5's built-in asset modules.
        test: /\.(png|jpe?g|gif)$/,
        type: "asset/inline",
      },
    ],
  },
  plugins: [
    new VueLoaderPlugin(),
    // Vue 3 esm-bundler feature flags (better tree-shaking, silences the warning)
    new webpack.DefinePlugin({
      __VUE_OPTIONS_API__: "true",
      __VUE_PROD_DEVTOOLS__: "false",
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: "false",
    }),
    // .vue type checking is done by vue-tsc (npm run typecheck), not here;
    // fork-ts-checker's vue extension needs Vue 2's vue-template-compiler.
    new ForkTsCheckerWebpackPlugin(),
  ],
  resolve: {
    extensions: [
      ".mjs",
      ".js",
      ".jsx",
      ".vue",
      ".json",
      ".wasm",
      ".ts",
      ".tsx",
    ],
    modules: ["node_modules"],
    fallback: {
      // Stop argon2-browser from trying to bring in node modules
      fs: false,
      path: false,
    },
  },
  output: {
    path: path.resolve(__dirname, "js"),
    publicPath: "/js/",
  },
};
