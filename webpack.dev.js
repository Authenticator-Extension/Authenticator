const path = require("path");
const { merge } = require('webpack-merge');
const common = require('./webpack.config.js');
const { ProvidePlugin, NormalModuleReplacementPlugin } = require("webpack");

module.exports = merge(common, {
  entry: {
    test: "./src/test.ts",
  },
  // Polyfills for mocha and sinon
  resolve: {
    fallback: {
      "util": require.resolve("util/"),
      "buffer": require.resolve('buffer/'),
      "stream": require.resolve("stream-browserify"),
      "events": require.resolve("events/")
    }
  },
  plugins: [
    new ProvidePlugin({
      process: 'process/browser.js',
    }),
    new ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    }),
    // mocha 11 requires Node core modules via the "node:" URI scheme
    // (e.g. require("node:fs")). Webpack treats that as a resource scheme
    // and never consults resolve.fallback for it, so strip the prefix
    // before resolution to fall back to the bare-name polyfills above.
    new NormalModuleReplacementPlugin(/^node:/, (resource) => {
      resource.request = resource.request.replace(/^node:/, "");
    }),
  ],
  module: {
    // to suppress mocha warnings
    exprContextCritical: false,
  },
});
