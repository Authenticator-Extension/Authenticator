const path = require("path");
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
    noParse: /\.wasm$/,
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
        loader: 'vue-svg-loader'
      },
      {
        test: /\.(png|jpe?g|gif)$/,
        use: [
          {
            loader: 'url-loader',
            options: {},
          }
        ]
      }
    ],
  },
  plugins: [
    new VueLoaderPlugin(),
    new ForkTsCheckerWebpackPlugin({
      typescript: {
        extensions: {
          vue: true
        }
      }
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
    modules: ["node_modules"],
    fallback: {
      // Stop argon2-browser from trying to bring in node modules
      fs: false,
      path: false
    }
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    publicPath: "/dist/"
  }
};
