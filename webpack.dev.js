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
    rules: [
      {
        // Note that while it is possible to instrument .vue files, it does not produce correct output. Do not show *.vue in coverage reports.
        loader: '@jsdevtools/coverage-istanbul-loader',
        options: { esModules: true },
        include: path.resolve(__dirname, 'src/'),
        exclude: [
          path.resolve(__dirname, 'src/test/'),
          path.resolve(__dirname, 'src/test.ts'),
          path.resolve(__dirname, 'src/mochaReporter.ts'),
          path.resolve(__dirname, 'node_modules/'),
        ],
        enforce: "post"
      }
    ],
    // to suppress mocha warnings
    exprContextCritical: false,
  },
});
