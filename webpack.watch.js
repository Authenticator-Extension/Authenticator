// TODO: this is broken because webpack-extension-reloader does not support webpack 5. 

const path = require('path');
const merge = require('webpack-merge');
const dev = require('./webpack.dev.js');
const ExtensionReloader = require('webpack-extension-reloader');
const {exec} = require('child_process');

// after compiling, the tests will automatically be run each time a file change occurs
const runTestsAfterBuild = () => {
  return {
    apply: (compiler) => {
      compiler.hooks.afterEmit.tap('AfterEmitPlugin', () => {
        // leave as node otherwise browser does not launch
        exec('node scripts/test-runner.js', (err, stdout, stderr) => {
          if (stdout) process.stdout.write(stdout);
          if (stderr) process.stderr.write(stderr);
        });
      });
    }
  }
};

module.exports = merge(dev, {
  mode: 'development',
  plugins: [
    new ExtensionReloader(),
    runTestsAfterBuild(),
  ],
  watch: true,
  watchOptions: {
    ignored: /node_modules/
  },
  output: {
    path: path.resolve(__dirname, 'test/chrome/dist'),
    publicPath: '/test/chrome/dist/'
  }
});
