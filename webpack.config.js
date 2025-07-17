//@ts-check
'use strict';
const path = require('path');

/**@type {import('webpack').Configuration}*/
const config = {
  target: 'node',
  mode: 'none',
  entry: './src/extension.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2'
  },
  externals: {
    vscode: 'commonjs vscode', // This is a crucial line for VS Code extensions
    // Native modules like sqlite3 cannot be bundled by webpack.
    // By listing it here, we tell webpack to treat it as an external dependency
    // that will be `require()`-d at runtime from the node_modules folder.
    sqlite3: 'commonjs sqlite3'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [{ loader: 'ts-loader' }]
      }
    ]
  },
  devtool: 'nosources-source-map'
};
module.exports = config;