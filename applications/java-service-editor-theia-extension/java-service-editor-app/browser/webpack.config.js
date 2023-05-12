/**
 * This file can be edited to customize webpack configuration.
 * To reset delete this file and rerun theia build again.
 */
// @ts-nocheck
const config = require('./gen-webpack.config.js');
//const CopyWebpackPlugin = require('copy-webpack-plugin');

/**
 * Expose bundled modules on window.theia.moduleName namespace, e.g.
 * window['theia']['@theia/core/lib/common/uri'].
 * Such syntax can be used by external code, for instance, for testing.
config.module.rules.push({
    test: /\.js$/,
    loader: require.resolve('@theia/application-manager/lib/expose-loader')
}); */
config[0].module.rules.push({
    test: /\.(woff)$/i,
    type: 'asset',
    parser: {
        dataUrlCondition: {
            maxSize: 10000,
        }
    },
    generator: {
        dataUrl: {
            mimetype: 'image/svg+xml'
        }
    }

});

// config.plugins.push(
//     new CopyWebpackPlugin({
//         patterns: [
//             {
//                 from: 'node_modules/@builtioflow/isac-elements/isac-assets', to: 'isac-assets',
//                 from: 'node_modules/@builtioflow/flow-editor-elements/ut-assets', to: 'ut-assets'
//             }
//         ],

//     }));
module.exports = config;