var webpack = require('webpack');
var UglifyJsPlugin = webpack.optimize.UglifyJsPlugin;
var path = require('path');
var env = require('yargs').argv.mode;
var libraryName = 'ele-vr-player';

var plugins = [];
plugins.push(new webpack.LoaderOptionsPlugin({
  minimize: true,
  debug: false,
}));
var outputFile;

if (env === 'build') {
  plugins.push(new UglifyJsPlugin({minimize: true}));
  outputFile = libraryName + '.min.js';
} else {
  outputFile = libraryName + '.js';
}

module.exports = () => {
  return {
    entry: path.resolve(process.cwd(), 'src', 'ele-vr-player.js'),
    devtool: 'cheap-module-eval-source-map',
    output: {
      path: path.resolve(process.cwd(), 'dist'),
      publicPath: '/dist',
      filename: outputFile,
      library: libraryName,
      libraryTarget: 'umd',
      umdNamedDefine: true,
    },
    module: {
      loaders: [
        {
          test: /(\.js)$/,
          loader: 'babel',
          exclude: /node_modules/,
        },
        {
          test: /(\.js)$/,
          loader: 'eslint-loader',
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      modules: [
        path.resolve(process.cwd(), 'src'),
        'node_modules',
      ],
    },
    plugins,
  };
};
