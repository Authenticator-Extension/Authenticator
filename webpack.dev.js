const path = require("path");
const { merge } = require('webpack-merge');
const common = require('./webpack.config.js');
const { ProvidePlugin } = require("webpack");

module.exports = merge(common, {
  entry: {
    test: "./src/test.ts",
  },
  // Polyfills for mocha and sinon
  resolve: {
    fallback: {
      "util": require.resolve("util/"),
      "buffer": require.resolve('buffer/'),
      "stream": require.resolve("stream-browserify")
    }
  },
  plugins: [
    new ProvidePlugin({
      process: 'process/browser.js',
    }),
    new ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    }),
  ],
  module: {
    // to suppress mocha warnings
    exprContextCritical: false,
  },
});
