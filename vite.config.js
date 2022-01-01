import {defineConfig} from 'vite';
import solidPlugin from 'vite-plugin-solid';
import * as pf from 'path';

export default defineConfig({
    publicDir: 'root', // to copy manifest.json and other stuff
    plugins: [solidPlugin({solid: {delegateEvents: false}})],
    build: {
        minify: false,
        outDir: 'dist/unpacked',
        emptyOutDir: false, // necessary for the watch task which runs vite (for pages) and rollup (for scripts) in parallel
                           // otherwise vite will erase scripts written to output dir by rollup
        target: 'esnext',
        polyfillDynamicImport: false,
        polyfillModulePreload: false,
        rollupOptions: {
            input: {
                'devtools-page': pf.resolve(__dirname, 'pages/devtools-page.html'),
                'panel': pf.resolve(__dirname, 'pages/panel.html'),
                'options': pf.resolve(__dirname, 'pages/options.html'),
                'popup-development': pf.resolve(__dirname, 'pages/popups/development.html'),
                'popup-production': pf.resolve(__dirname, 'pages/popups/production.html'),
                'popup-disabled': pf.resolve(__dirname, 'pages/popups/disabled.html'),
                'popup-restricted': pf.resolve(__dirname, 'pages/popups/restricted.html')
            }
        }
    }
});
