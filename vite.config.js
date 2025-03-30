import { resolve } from 'node:path';
import { readFileSync, writeFileSync, mkdirSync, existsSync, dirname } from 'node:fs';
import { defineConfig as defineViteConfig } from 'vite';
import viteVue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import * as ComponentResolvers from 'unplugin-vue-components/resolvers';
import { visualizer } from 'rollup-plugin-visualizer';
import Inspect from 'vite-plugin-inspect';

// import { viteZip as ZipFile } from 'vite-plugin-zip-file';
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
import { fnFileProtocolPath, fnOmit, fnImport, log4state, getYiteNodeModules } from './utils/index.js';
import { fnAppDir } from './system.js';

const appDir = fnAppDir(process.env.YITE_CLI_WORK_DIR);
const globalStylePath = resolve(appDir, 'src/styles/variable.scss');

// 确保文件存在，如果不存在则创建（包括父目录）
if (!existsSync(globalStylePath)) {
    const dir = dirname(globalStylePath);
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
    writeFileSync(globalStylePath, '', 'utf-8');
}

const globalStyles = readFileSync(globalStylePath, 'utf-8');

export default defineViteConfig(async ({ command, mode }) => {
    // 确保缓存目录存在
    const cacheDir = resolve(appDir, '.cache');
    if (!existsSync(cacheDir)) {
        mkdirSync(cacheDir, { recursive: true });
    }

    const yiteConfigPath = fnFileProtocolPath(resolve(appDir, 'yite.config.js'));
    const { yiteConfig } = await fnImport(yiteConfigPath, 'yiteConfig', {});
    if (!yiteConfig.viteConfig) {
        console.log(`${log4state('error')} 请确认是否存在 yite.config.js 文件`);
        process.exit();
    }

    // 读取 package.json
    let pkg = {};
    try {
        const packageContent = readFileSync(resolve(appDir, 'package.json'), 'utf-8');
        pkg = JSON.parse(packageContent);
    } catch (e) {
        // 如果文件不存在或解析失败，使用空对象
        pkg = {};
    }

    const findPort = await portfinder.getPortPromise({ port: 8000, stopPort: 9000 });

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
                resolve(appDir, 'src', 'plugins'),
                resolve(appDir, 'src', 'hooks'),
                resolve(appDir, 'src', 'utils'),
                resolve(appDir, 'src', 'config')
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
                resolve(appDir, 'src', 'components')
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
                        replacement: getYiteNodeModules('vue/dist/vue.esm-bundler.js')
                    },
                    {
                        find: /^vue-i18n$/,
                        replacement: getYiteNodeModules('vue-i18n/dist/vue-i18n.esm-bundler.js')
                    },
                    {
                        find: /^vue-router$/,
                        replacement: getYiteNodeModules('vue-router/dist/vue-router.esm-bundler.js')
                    },
                    {
                        find: /^pinia$/,
                        replacement: getYiteNodeModules('pinia/index.cjs')
                    },
                    {
                        find: /^sass$/,
                        replacement: getYiteNodeModules('sass/sass.default.js')
                    },
                    {
                        find: '@',
                        replacement: resolve(appDir, 'src')
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
                    output: {}
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

    // 写入配置文件
    const viteConfigPath = resolve(appDir, '.cache', 'vite-config.json');
    writeFileSync(viteConfigPath, JSON.stringify(viteConfig, null, 2), 'utf-8');

    return viteConfig;
});
