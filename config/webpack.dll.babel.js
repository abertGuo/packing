/**
 * webpack开发环境配置文件
 * @author Joe Zhong <zhong.zhi@163.com>
 * @module config/webpack.serve.babel
 */

import path from 'path';
import webpack from 'webpack';
import CleanPlugin from 'clean-webpack-plugin';
import autoprefixer from 'autoprefixer';
import pRequire from '../util/require';

const packing = pRequire('config/packing');
const { assetExtensions } = packing;
const { src, assets, dll } = packing.path;
const cwd = process.cwd();

/**
 * 返回样式loader字符串
 * @param {string} cssPreprocessor css预处理器类型
 * @return {string}
 */
const styleLoaderString = (cssPreprocessor) => {
  const query = cssPreprocessor ? `!${cssPreprocessor}` : '';
  return `style!css?importLoaders=2!postcss${query}`;
};

/**
 * 生成webpack配置文件
 * @param {object} program 程序进程，可以获取启动参数
 * @return {object}
 */
const webpackConfig = () => {
  const context = cwd;
  const devtool = 'eval';
  const entry = packing.commonChunks;
  const output = {
    path: path.join(cwd, dll),
    filename: '[name].js',
    library: '[name]_[hash]',
  };

  const moduleConfig = {
    loaders: [
      { id: 'js', test: /\.js?$/i, loaders: ['babel', 'eslint'], exclude: /node_modules/ },
      { id: 'css', test: /\.css$/i, loader: styleLoaderString() },
      { id: 'less', test: /\.less$/i, loader: styleLoaderString('less') },
      { id: 'sass', test: /\.scss$/i, loader: styleLoaderString('sass') },
      {
        id: 'assets',
        test: new RegExp(`.(${assetExtensions.join('|')})$`, 'i'),
        loader: `file?name=[path][name].[ext]&context=${assets}&emitFile=false`,
      },
    ],
  };

  const postcss = () => [autoprefixer];

  const resolve = {
    modulesDirectories: [src, assets, 'node_modules'],
  };

  const plugins = [
    new CleanPlugin([dll], {
      root: cwd,
    }),

    new webpack.DllPlugin({
      path: path.join(output.path, '[name]-manifest.json'),
      name: '[name]_[hash]',
    }),

    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify(process.env.NODE_ENV),
      },
    }),

  ];

  return {
    context,
    entry,
    output,
    module: moduleConfig,
    postcss,
    resolve,
    plugins,
    devtool,
  };
};

export default program => webpackConfig(program);
