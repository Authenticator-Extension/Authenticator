const merge = require('webpack-merge');
const common = require('./webpack.config.js');

module.exports = merge(common, {
  mode: "development",
  entry: {
    test: "./src/test.ts"
  },
});
