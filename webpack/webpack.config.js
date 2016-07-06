import path from 'path';
import { isString, isArray, isObject } from 'util';
import webpack from 'webpack';
import CleanPlugin from 'clean-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import ExtractTextPlugin from 'extract-text-webpack-plugin';
import ReplaceHashWebpackPlugin from 'replace-hash-webpack-plugin';
import HtmlWebpackPlugin from 'packing-html-webpack-plugin';
import RevWebpackPlugin from './packing-rev-webpack-plugin';
import strip from 'strip-loader';
import glob from 'glob';
import packing from './packing.config';

const { dist, templates, entries, assets, assetsDist, templatesDist } = packing.path;
const clientJS = 'webpack-hot-middleware/client';

/**
 * 给所有入口js加上HRM的clientjs
 */
const pushClientJS = entry => {
  let newEntry = entry;
  if (isString(newEntry)) {
    newEntry = [clientJS, newEntry];
  } else if (isArray(newEntry)) {
    newEntry.unshift(clientJS);
  } else if (isObject(newEntry)) {
    Object.keys(newEntry).forEach(key => {
      newEntry[key] = pushClientJS(newEntry[key]);
    });
  }
  return newEntry;
};

/**
 * 根据文件的目录结构生成entry配置
 */
const initConfig = () => {
  const entryConfig = {};
  const htmlWebpackPluginConfig = [];
  const ext = '.jade';
  glob.sync(`**/*${ext}`, {
    cwd: path.resolve(templates, 'pages')
  }).forEach(page => {
    const key = page.replace(ext, '');
    const value = `./${entries}/${page.replace(ext, '.js')}`;

    // 写入页面级别的配置
    entryConfig[key] = value;
    const templateInitData = path.resolve('mock/page', page.replace(ext, '.js'));
    htmlWebpackPluginConfig.push({
      filename: page.replace(ext, '.html'),
      template: path.resolve(templates, 'pages', page),
      templateInitData,
      cache: false,
      inject: false,
      // hash: true,
      chunks: [key],
      // excludeChunks: ['dev-helper'],
    });
  });
  return {
    entryConfig,
    htmlWebpackPluginConfig
  };
};

/**
 * options:
 * options.hot
 * options.release
 * options.longTermCaching
 * options.build
 * options.progress
 * options.devtool
 * options.minimize
 */
export default (options) => {
  const { entryConfig, htmlWebpackPluginConfig } = initConfig();
  const cwd = process.cwd();
  const projectRootPath = path.resolve(__dirname, '../');
  // console.log('projectRootPath: ', projectRootPath);
  const assetsPath = path.resolve(projectRootPath, `./${dist}/assets`);
  const chunkhash = options.longTermCaching ? '-[chunkhash:8]' : '';

  const devtool = options.devtool ? 'inline-source-map' : 'source-map';
  const progress = options.progress;
  const context = path.resolve(__dirname, '..');

  // entry可能是字符串／数组／对象
  let entry = entryConfig;
  // let entry = {
  //   main: [
  //     './src/client.js'
  //   ],
  //   list: './src/list.js',
  //   other: [
  //     './src/client2.js'
  //   ]
  // };
  // let entry = './src/client.js';
  // let entry = {
  //   main: [
  //     // 'webpack-hot-middleware/client',
  //     './src/client.js'
  //   ],
  //   other: './src/client2.js'
  // };

  const output = {
    chunkFilename: `[name]${chunkhash}.js`,
    filename: `[name]${chunkhash}.js`,
    // prd环境静态文件输出地址
    path: assetsPath,
    // dev环境下数据流访问地址
    publicPath: '',
    // publicPath: '/assets/'
  };

  /* eslint-disable */
  let moduleConfig = {
    loaders: [
      { test: /\.json$/, loader: 'json' },
      { test: /\.woff(\?v=\d+\.\d+\.\d+)?$/, loader: "url?limit=10000&mimetype=application/font-woff" },
      { test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/, loader: "url?limit=10000&mimetype=application/font-woff" },
      { test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/, loader: "url?limit=10000&mimetype=application/octet-stream" },
      { test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, loader: "file" },
      { test: /\.svg(\?v=\d+\.\d+\.\d+)?$/, loader: "url?limit=10000&mimetype=image/svg+xml" },
      { test: /\.jpg$/, loader: 'url?name=[name]-[hash:8].[ext]&limit=10240' },
      { test: /\.jade$/, loader: 'jade' },
      { test: /\.html$/, loader: 'html' },
    ]
  };

  const devLoaders = [
    { test: /\.js?$/, loaders: ['babel', 'eslint'], exclude: /node_modules/},
    // { test: /\.less$/, loader: 'style!css?modules&importLoaders=2&sourceMap&localIdentName=[local]___[hash:base64:5]!autoprefixer?browsers=last 2 version!less?outputStyle=expanded&sourceMap' },
    { test: /\.less$/, loader: 'style!css?importLoaders=2&localIdentName=[local]___[hash:base64:8]!autoprefixer?browsers=last 2 version!less?outputStyle=expanded' },
    { test: /\.scss$/, loader: 'style!css?importLoaders=2&localIdentName=[local]___[hash:base64:8]!autoprefixer?browsers=last 2 version!sass?outputStyle=expanded' },
  ];
  const prdLoaders = [
    { test: /\.js?$/, loaders: [strip.loader('debug'), 'babel'], exclude: /node_modules/},
    { test: /\.less$/, loader: ExtractTextPlugin.extract('style', 'css?importLoaders=2!autoprefixer?browsers=last 2 version!less?outputStyle=expanded&sourceMapContents') },
    { test: /\.scss$/, loader: ExtractTextPlugin.extract('style', 'css?importLoaders=2!autoprefixer?browsers=last 2 version!sass?outputStyle=expanded&sourceMapContents') },
  ];
  /* eslint-enable */
  moduleConfig.loaders.push(options.build ? prdLoaders : devLoaders);

  const resolve = {
    alias: {
      'env-alias': path.resolve(__dirname, '../src/config/env', process.env.NODE_ENV)
    },
    modulesDirectories: [
      'src',
      'node_modules'
    ],
    extensions: ['', '.json', '.js', '.jsx']
  };

  const devPlugins = htmlWebpackPluginConfig.map((item) => new HtmlWebpackPlugin(item));

  const buildPlugins = [
    new CleanPlugin([dist], {
      root: projectRootPath
    }),

    new CopyWebpackPlugin([{
      context: templates,
      src: '**/*',
      to: path.join(cwd, dist, 'templates'),
    }]),

    // css files from the extract-text-plugin loader
    new ExtractTextPlugin(`[name]${chunkhash}.css`, {
      allChunks: true
    }),

    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: '"production"'
      }
    }),

    new ReplaceHashWebpackPlugin({
      assetsDomain: process.env.CDN_ROOT,
      cwd: path.join(cwd, templates),
      src: '**/*.jade',
      dest: path.join(cwd, templatesDist),
    }),

    new RevWebpackPlugin({
      cwd: path.join(cwd, assets),
      src: '**/*.{jpg,png}',
      dest: path.join(cwd, assetsDist),
    }),

  ];

  const plugins = options.build ? buildPlugins : devPlugins;

  if (options.minimize) {
    plugins.push(
      // optimizations
      new webpack.optimize.DedupePlugin(),
      new webpack.optimize.OccurenceOrderPlugin(),
      new webpack.optimize.UglifyJsPlugin({
        compress: {
          warnings: false,
          drop_debugger: true,
          drop_console: true,
        },
        comments: /^!/,
      })
    );
  }

  if (options.hot) {
    entry = pushClientJS(entry);
    plugins.push(
      new webpack.HotModuleReplacementPlugin()
    );
    // moduleConfig.loaders.unshift({
    //   test: /\.js$/,
    //   loader: 'react-hot',
    //   exclude: nodeModuleReg
    // });
  }

  return {
    devtool,
    context,
    progress,
    entry,
    output,
    module: moduleConfig,
    resolve,
    plugins,
  };
};
