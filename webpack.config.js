const path = require('path');
const VueLoaderPlugin = require('vue-loader/lib/plugin');

module.exports = {
  mode: 'development',
  devtool: 'source-map',
  entry: {
    background: './src/background.ts',
    content: './src/content.ts',
    popup: './src/popup.ts',
    import: './src/import.ts',
    qr: './src/qr.ts',
    qrdebug: './src/qrdebug.ts',
    test: './src/test/test.ts'
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      }
    ]
  },
  plugins: [
    new VueLoaderPlugin()
  ],
  resolve: {
    extensions: ['.vue', '.tsx', '.ts', '.js'],
  },
  output: {
    path: path.resolve(__dirname, 'dist')
  }
};
