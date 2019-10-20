const path = require("path");
const VueLoaderPlugin = require("vue-loader/lib/plugin");
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
    qr: "./src/qr.ts",
    qrdebug: "./src/qrdebug.ts",
    test: "./src/test/test.ts"
  },
  // For argon2-browser
  node: {
    fs: "empty"
  },
  module: {
    rules: [
      {
        // argon2-browser overrides
        test: /\.wasm$/,
        loader: "base64-loader",
        type: "javascript/auto"
      },
      {
        test: /\.tsx?$/,
        loader: "ts-loader",
        options: {
          appendTsSuffixTo: [/\.vue$/],
          transpileOnly: true
        },
        exclude: /node_modules/
      },
      {
        test: /\.vue$/,
        loader: "vue-loader"
      },
      {
        test: /\.svg$/,
        loader: "vue-svg-loader"
      }
    ]
  },
  plugins: [
    new VueLoaderPlugin(),
    new ForkTsCheckerWebpackPlugin({
      vue: true
    })
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
      ".tsx"
    ],
    modules: ["node_modules"]
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    publicPath: "/dist/"
  }
};
