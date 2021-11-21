import rollupPluginCommonJS from '@rollup/plugin-commonjs';
import rollupPluginNodeResolve from '@rollup/plugin-node-resolve';
import rollupPluginTypeScript from '@rollup/plugin-typescript';
//import {terser as rollupPluginTerser} from 'rollup-plugin-terser';

const plugins = [
    rollupPluginCommonJS(),
    rollupPluginNodeResolve({browser: true}),
    rollupPluginTypeScript()
];

const commonOutputSettings = {
    format: 'iife',
    generatedCode: 'es2015'
// ? sourcemaps are of no use in chrome extension code due to the following error
// DevTools failed to load source map: Could not load content for chrome-extension://ohagojhoicbfgahanijppkommknfljje/scripts/the-hook.js.map: HTTP error: status code 404, net::ERR_UNKNOWN_URL_SCHEME
//        sourcemap: true,
//        plugins: [rollupPluginTerser()]
};

export default [{
    plugins,
    input: 'src/background-worker.ts',
    output: {
        ...commonOutputSettings,
        file: 'dist/unpacked/scripts/background-worker.js'
    }
}, {
    plugins,
    input: 'src/inject-global-hook.ts',
    output: {
        ...commonOutputSettings,
        file: 'dist/unpacked/scripts/inject-global-hook.js'
    }
}, {
    plugins,
    input: 'src/the-hook.ts',
    output: {
        ...commonOutputSettings,
        file: 'dist/unpacked/scripts/the-hook.js'
    }
}];
