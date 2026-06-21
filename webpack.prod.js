const { merge } = require('webpack-merge');
const common = require('./webpack.config.js');

module.exports = merge(common, {
  mode: 'production',
  // The base config enables full source maps for development; don't ship them
  // (and the .map files build.sh copies) in production release artifacts.
  devtool: false,
});
