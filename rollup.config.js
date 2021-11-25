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
    input: 'src/hook/hook.ts',
    output: {
        ...commonOutputSettings,
        file: 'dist/unpacked/scripts/hook.js'
    }
}, {
    plugins,
    input: 'src/hook/hook-stub.ts',
    output: {
        ...commonOutputSettings,
        file: 'dist/unpacked/scripts/hook-stub.js'
    }
}, {
    plugins,
    input: 'src/content-script-relay.ts',
    output: {
        ...commonOutputSettings,
        file: 'dist/unpacked/scripts/content-script-relay.js'
    }
}, {
    plugins,
    input: 'src/on-panel-deactivated.ts',
    output: {
        ...commonOutputSettings,
        file: 'dist/unpacked/scripts/on-panel-deactivated.js'
    }
}];
