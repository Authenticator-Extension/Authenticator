const path = require('path');

module.exports = {
  mode: 'development',
  devtool: 'source-map',
  entry: {
    background: './src/background.ts',
    content: './src/content.ts',
    popup: './src/popup.ts',
    qrdebug: './src/qrdebug.ts'
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.html$/,
        loader: 'vue-template-loader'
      }
    ]
  },
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ],
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, 'dist')
  }
};
