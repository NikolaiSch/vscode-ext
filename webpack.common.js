const webpack = require("webpack");
const CopyPlugin = require("copy-webpack-plugin");
const path = require("path");

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

/** @type WebpackConfig */
module.exports = {
  target: "node",
  entry: {
    extension: "./src/extension.ts",
    debugger: "./src/debugger.ts",
  },
  output: {
    path: path.join(__dirname, "out", "src"),
    filename: "[name].js",
    libraryTarget: "commonjs2",
  },
  optimization: {
    minimize: true,
  },
  externals: function ({ context, request }, callback) {
    if (/^vscode$/.test(request)) {
      return callback(null, "commonjs " + request);
    } else if (/^electron$/.test(request)) {
      return callback(null, 'require ("' + request + '")');
    }
    callback();
  },
  resolve: {
    // .json is added to prevent import error from /node_modules/got/index.js
    extensions: [".ts", ".js", ".json"],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        loader: "ts-loader",
        options: {
          transpileOnly: true,
        },
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "./src/debugAdapter/web3ProviderResolver.js", to: "./" },
        { from: "./src/helpers/checkTruffleConfigTemplate.js", to: "./" },
      ],
    }),
    new webpack.DefinePlugin({
      IS_BUNDLE_TIME: true,
    }),
  ],
  node: {
    __dirname: false,
  },
};
