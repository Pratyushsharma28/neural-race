const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => {
  const production = argv && argv.mode === 'production';

  return {
    entry: './src/main.jsx',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: production ? 'assets/[name].[contenthash].js' : 'assets/[name].js',
      publicPath: '/',
      clean: true,
    },
    resolve: {
      extensions: ['.js', '.jsx'],
    },
    module: {
      rules: [
        {
          test: /\.jsx?$/,
          exclude: /node_modules/,
          use: 'babel-loader',
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
        {
          test: /\.(png|jpe?g|gif|svg|woff2?|glb|gltf)$/,
          type: 'asset/resource',
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './public/index.html',
        title: 'NEURAL//RACE',
      }),
    ],
    devtool: production ? 'source-map' : 'eval-cheap-module-source-map',
    devServer: {
      static: path.resolve(__dirname, 'public'),
      historyApiFallback: true,
      hot: true,
      port: 3000,
      open: false,
      client: { overlay: { errors: true, warnings: false } },
    },
    performance: { hints: false },
  };
};
