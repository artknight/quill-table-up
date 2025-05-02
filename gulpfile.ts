import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import autoprefixer from 'autoprefixer';
import { dest, parallel, series, src, task, watch } from 'gulp';
import less from 'gulp-less';
import postcss from 'gulp-postcss';
import pxtorem from 'postcss-pxtorem';
import { rollup } from 'rollup';
import { dts } from 'rollup-plugin-dts';
import svg from 'rollup-plugin-svg-import';
import babel from '@rollup/plugin-babel';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distBundle = resolve(__dirname, './dist');
const demoBundle = resolve(__dirname, './docs');

async function buildDts() {
    const bundle = await rollup({
        input: './src/index.ts',
        external: [/^quill/],
        treeshake: true,
        plugins: [dts({ tsconfig: './tsconfig.json' })],
    });
    return bundle.write({
        file: resolve(distBundle, 'index.d.ts'),
        sourcemap: false,
        format: 'es',
    });
}

async function buildTs(isDev: boolean = false) {
    const basePlugins = [
        typescript({ tsconfig: './tsconfig.json', exclude: ['src/__tests__'] }),
        nodeResolve(),
        svg({ stringify: true }),
    ];

    const umdPlugins = [
        ...basePlugins,
        babel({
            babelHelpers: 'bundled',
            extensions: ['.js', '.ts'],
            presets: [['@babel/preset-env', { targets: '> 0.25%, not dead, IE 11' }]],
            exclude: 'node_modules/**',
        }),
    ];

    // Bundle for UMD outputs (unminified)
    const umdBundle = await rollup({
        input: './src/index.ts',
        external: [/^quill/],
        treeshake: true,
        plugins: umdPlugins,
    });

    await umdBundle.write({
        file: resolve(distBundle, 'index.umd.js'),
        sourcemap: false,
        format: 'umd',
        name: 'TableUp',
        globals: {
            quill: 'Quill',
        },
        exports: 'named',
    });

    await umdBundle.write({
        file: resolve(demoBundle, 'index.umd.js'),
        sourcemap: false,
        format: 'umd',
        name: 'TableUp',
        globals: {
            quill: 'Quill',
        },
        exports: 'named',
    });

    if (!isDev) {
        await umdBundle.write({
            file: resolve(distBundle, 'index.iife.js'),
            sourcemap: false,
            format: 'iife',
            name: 'TableUp', // this becomes `window.TableUp`
            globals: { quill: 'Quill' },
            exports: 'named',
        });
    }

    // Bundle for ESM output (minified only in production)
    const esmPlugins = isDev ? basePlugins : [...basePlugins, terser()];
    const esmBundle = await rollup({
        input: './src/index.ts',
        external: [/^quill/],
        treeshake: true,
        plugins: esmPlugins,
    });

    return esmBundle.write({
        file: resolve(distBundle, 'index.js'),
        sourcemap: true,
        format: 'es',
    });
}

async function buildTheme(isDev: boolean = false) {
    const bundle = await src(['./src/style/index.less', './src/style/table-creator.less'])
        .pipe(less({ compress: false }))
        .pipe(
            postcss([
                autoprefixer(),
                pxtorem({
                    rootValue: 16,
                    propList: ['*'],
                    selectorBlackList: ['.ql-'],
                }),
            ]),
        );

    await bundle.pipe(dest(distBundle));
    return bundle.pipe(dest(demoBundle));
}

function dev() {
    watch(['./src/**/*.ts', '!./src/**/__tests__/**/*'], parallel(buildTs.bind(undefined, true), buildDts));
    watch('./src/**/*.less', buildTheme.bind(undefined, true));
    spawn('node', ['./server.js'], {
        cwd: __dirname,
        stdio: 'inherit',
        shell: process.platform === 'win32',
    });
}
task('dev', series(dev));

task('default', parallel(
    buildTs.bind(undefined, false),
    buildDts,
    buildTheme.bind(undefined, false),
    buildTs.bind(undefined, true),
    buildTheme.bind(undefined, true),
));
