/**
 * This file can be edited to customize webpack configuration.
 * To reset delete this file and rerun theia build again.
 */
// @ts-nocheck
import config, { module as _module, plugins } from './gen-webpack.config.js';
import CopyWebpackPlugin from 'copy-webpack-plugin';

/**
 * Expose bundled modules on window.theia.moduleName namespace, e.g.
 * window['theia']['@theia/core/lib/common/uri'].
 * Such syntax can be used by external code, for instance, for testing.
config.module.rules.push({
    test: /\.js$/,
    loader: require.resolve('@theia/application-manager/lib/expose-loader')
}); */
_module.rules.push({
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

plugins.push(
    new CopyWebpackPlugin({
        patterns: [
            {
                from: 'node_modules/@builtioflow/origin-shared-components/assets', to: 'assets'
            }
        ],

    }));
export default config;