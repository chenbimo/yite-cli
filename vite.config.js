import path from 'node:path';
import { readFileSync } from 'node:fs';
import { defineConfig as defineViteConfig } from 'vite';
import viteVue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import * as ComponentResolvers from 'unplugin-vue-components/resolvers';
import { visualizer } from 'rollup-plugin-visualizer';
import Inspect from 'vite-plugin-inspect';

// import { viteZip as ZipFile } from 'vite-plugin-zip-file';
import { ensureDirSync, readJsonSync, outputJsonSync, ensureFileSync } from 'fs-extra/esm';
import portfinder from 'portfinder';

import { mergeAndConcat } from 'merge-anything';
import Unocss from 'unocss/vite';
import Icons from 'unplugin-icons/vite';
import IconsResolver from 'unplugin-icons/resolver';
import ReactivityTransform from '@vue-macros/reactivity-transform/vite';
import VueDevTools from 'vite-plugin-vue-devtools';
// import Markdown from 'vite-plugin-md';

// 内部文件
import { yiteRouter } from './plugins/router.js';
import { yiteI18n } from './plugins/i18n.js';
import unocssConfig from './unocss.config.js';
import { fnFileProtocolPath, fnOmit, fnImport, log4state } from './utils/index.js';
import { fnAppDir } from './system.js';

const appDir = fnAppDir(process.env.YITE_CLI_WORK_DIR);
const globalStylePath = path.resolve(appDir, 'src/styles/variable.scss');
ensureFileSync(globalStylePath);
const globalStyles = readFileSync(globalStylePath, 'utf-8');

export default defineViteConfig(async ({ command, mode }) => {
    // 没有则生成目录
    ensureDirSync(appDir, '.cache');
    const yiteConfigPath = fnFileProtocolPath(path.resolve(appDir, 'yite.config.js'));
    const { yiteConfig } = await fnImport(yiteConfigPath, 'yiteConfig', {});
    if (!yiteConfig.viteConfig) {
        console.log(`${log4state('error')} 请确认是否存在 yite.config.js 文件`);
        process.exit();
    }

    const pkg = readJsonSync(path.resolve(appDir, 'package.json'), { throws: false }) || {};

    const findPort = await portfinder.getPortPromise({ port: 8000, stopPort: 9000 });

    // 每个项目依赖包进行分割
    // let splitDependencies = {};
    // let includeDeps = [];
    // for (let prop in pkg.dependencies) {
    //     if (pkg.dependencies.hasOwnProperty(prop)) {
    //         splitDependencies[prop] = [prop];
    //         includeDeps.push(prop);
    //     }
    // }

    // 自动导入插件
    const autoImportConfig = mergeAndConcat(
        {
            include: [
                //
                /\.[tj]sx?$/, // .ts, .tsx, .js, .jsx
                /\.vue$/,
                /\.vue\?vue/, // .vue
                /\.md$/ // .md
            ],
            imports: [
                'vue',
                {
                    'vue-router': [
                        //
                        'RouterLink',
                        'RouterView',
                        'START_LOCATION',
                        'createMemoryHistory',
                        'createRouter',
                        'createWebHashHistory',
                        'createWebHistory',
                        'isNavigationFailure',
                        'loadRouteLocation',
                        'onBeforeRouteLeave',
                        'onBeforeRouteUpdate',
                        'useLink',
                        'useRoute',
                        'useRouter'
                    ],
                    pinia: [
                        //
                        'PiniaVuePlugin',
                        'acceptHMRUpdate',
                        'createPinia',
                        'defineStore',
                        'disposePinia',
                        'getActivePinia',
                        'mapActions',
                        'mapGetters',
                        'mapState',
                        'mapStores',
                        'mapWritableState',
                        'setActivePinia',
                        'setMapStoreSuffix',
                        'skipHydrate',
                        'storeToRefs'
                    ]
                }
            ],
            dirs: [
                //
                path.resolve(appDir, 'src', 'plugins'),
                path.resolve(appDir, 'src', 'hooks'),
                path.resolve(appDir, 'src', 'utils'),
                path.resolve(appDir, 'src', 'config')
            ],
            defaultExportByFilename: true,
            vueTemplate: true,
            dts: '.cache/auto-imports.d.ts',
            resolvers: [],
            eslintrc: {
                enabled: true,
                filepath: './.cache/eslintrc-auto-import.json',
                globalsPropValue: 'readonly'
            }
        },
        fnOmit(yiteConfig?.autoImport || {}, ['resolvers']),
        {
            resolvers: yiteConfig?.autoImport?.resolvers?.map((item) => ComponentResolvers[item.name](item.options)) || []
        }
    );

    // 自动导入组件
    const componentsConfig = mergeAndConcat(
        {
            dirs: [
                //
                path.resolve(appDir, 'src', 'components')
            ],
            dts: '.cache/components.d.ts',
            version: 3,
            directoryAsNamespace: true,
            resolvers: [IconsResolver()]
        },
        fnOmit(yiteConfig?.autoComponent || {}, ['resolvers']),
        {
            resolvers:
                yiteConfig?.autoComponent?.resolvers?.map((item) => {
                    return ComponentResolvers[item.name](item.options);
                }) || []
        }
    );

    // 代码分割
    // let chunkSplitConfig = {
    // strategy: 'default',
    // customChunk: (args) => {
    //     if (args.file.endsWith('.png')) {
    //         return 'png';
    //     }
    //     return null;
    // },
    // customSplitting: Object.assign(splitDependencies, yiteConfig?.chunkSplit || {})
    // };

    // 插件列表
    let allPlugins = [];
    // allPlugins.push(Markdown()) ;
    allPlugins.push(yiteRouter({}));
    allPlugins.push(yiteI18n({}));
    allPlugins.push(ReactivityTransform());
    allPlugins.push(
        Icons({
            compiler: 'vue3'
        })
    );

    allPlugins.push(Components(componentsConfig));
    allPlugins.push(AutoImport(autoImportConfig));
    allPlugins.push(Unocss(unocssConfig));
    // allPlugins.push(ChunkSplit(chunkSplitConfig));
    // 默认不使用二维码，多个网卡情况下会很乱
    // allPlugins.push(YiteQrcode());
    // allPlugins.push(ZipFile(zipPlugin));
    allPlugins.push(
        visualizer({
            filename: '.cache/stats.html',
            title: pkg?.name || '编译可视化'
        })
    );
    allPlugins.push(
        viteVue({
            include: [/\.vue$/, /\.md$/],
            ...(yiteConfig?.pluginsConfig?.vue || {})
        })
    );

    if (yiteConfig?.devtool === true) {
        allPlugins.push(VueDevTools({}));
    }
    if (yiteConfig?.inspect === true) {
        allPlugins.push(Inspect({}));
    }

    const viteConfig = mergeAndConcat(
        {
            plugins: allPlugins,
            css: {
                preprocessorOptions: {
                    scss: {
                        additionalData: globalStyles
                    }
                }
            },
            resolve: {
                alias: [
                    {
                        find: /^vue$/,
                        replacement: path.resolve(appDir, 'node_modules', 'vue', 'dist', 'vue.esm-bundler.js')
                    },
                    {
                        find: /^vue-i18n$/,
                        replacement: path.resolve(appDir, 'node_modules', 'vue-i18n', 'dist', 'vue-i18n.esm-bundler.js')
                    },
                    {
                        find: /^vue-router$/,
                        replacement: path.resolve(appDir, 'node_modules', 'vue-router', 'dist', 'vue-router.esm-bundler.js')
                    },
                    {
                        find: /^pinia$/,
                        replacement: path.resolve(appDir, 'node_modules', 'pinia', 'index.js')
                    },
                    {
                        find: /^sass$/,
                        replacement: path.resolve(appDir, 'node_modules', 'sass', 'sass.default.js')
                    },
                    {
                        find: '@',
                        replacement: path.resolve(appDir, 'src')
                    }
                ]
            },
            optimizeDeps: {
                include: []
            },
            root: appDir,
            base: './',
            mode: process.env.YITE_CLI_ENV,
            logLevel: 'info',
            build: {
                minify: process.env.YITE_CLI_MODE === 'development' ? false : true,
                reportCompressedSize: false,
                chunkSizeWarningLimit: 4096,
                target: ['es2022'],
                rollupOptions: {
                    plugins: [],
                    output: {
                        // TODO: 进一步研究 22
                        // assetFileNames: ({ name }) => {
                        //     if (/\.(gif|jpe?g|png|svg)$/.test(name ?? '')) {
                        //         return 'assets/images/[name]-[hash][extname]';
                        //     }
                        //     if (/\.css$/.test(name ?? '')) {
                        //         return 'assets/css/[name]-[hash][extname]';
                        //     }
                        //     }
                        //     return 'assets/[name]-[hash][extname]';
                        // }
                    }
                }
            },
            server: {
                host: '0.0.0.0',
                port: findPort,
                watch: {
                    ignored: ['**/node_modules/**/*', '**/.git/**/*']
                }
            }
        },
        yiteConfig?.viteConfig || {}
    );
    outputJsonSync(path.resolve(appDir, '.cache', 'vite-config.json'), viteConfig);
    return viteConfig;
});
