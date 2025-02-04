import path from 'node:path';
import { defineConfig as defineUnocssConfig } from 'unocss';
import { fnImport, fnFileProtocolPath } from './utils/index.js';
import { fnAppDir } from './system.js';

// unocss相关配置
import { presetAttributify, presetUno, presetIcons } from 'unocss.config.js';
import transformerVariantGroup from '@unocss/transformer-variant-group';
import transformerCompileClass from '@unocss/transformer-compile-class';
import transformerDirectives from '@unocss/transformer-directives';

const appDir = fnAppDir(process.env.YITE_CLI_WORK_DIR);
const yiteConfigPath = fnFileProtocolPath(path.resolve(appDir, 'yite.config.js'));
const { yiteConfig } = await fnImport(yiteConfigPath, {});
const unocssConfig = Object.assign(
    {
        presets: [
            //
            presetUno(),
            presetAttributify()
        ],
        transformers: [
            //
            transformerDirectives(),
            transformerVariantGroup(),
            transformerCompileClass()
        ],
        rules: []
    },
    yiteConfig?.unocssConfig || {}
);

export default defineUnocssConfig(unocssConfig);
