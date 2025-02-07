import { fileURLToPath } from 'node:url';
import { basename, dirname, join, resolve } from 'node:path';
import { readdirSync, existsSync } from 'node:fs';
import { colors } from './colors.js';
import { fnAppDir } from '../system.js';

const appDir = fnAppDir(process.env.YITE_CLI_WORK_DIR);

// 获取file协议的路径
export function fnFileProtocolPath(_path) {
    if (_path.startsWith('file:')) {
        return _path;
    } else {
        return 'file:///' + _path.replace(/\\+/gi, '/');
    }
}

/**
 * 可控导入
 * @param {String} path 导入路径
 * @param {Any} default 默认值
 */
export async function fnImport(path, name, defaultValue) {
    try {
        const data = await import(path);
        return data;
    } catch (err) {
        console.log('🚀 ~ fnImport ~ err:', err);
        return {
            [name]: defaultValue
        };
    }
}

/**
 * 获取所有环境变量.env文件的文件名组成的数组
 * @returns array 环境变量数组
 */
export function fnGetEnvNames(promptParams, appDir) {
    const files = readdirSync(appDir);
    const envFiles = files
        .filter((file) => {
            return /\.env\.[\da-z]+/.test(file);
        })
        .map((file) => {
            return file.replace('.env.', '');
        });
    return envFiles;
}

// 排除掉无用的属性
export function fnOmit(obj, exclude = []) {
    const obj2 = {};
    for (let prop in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, prop)) {
            if (exclude.includes(prop) === false) {
                obj2[prop] = obj[prop];
            }
        }
    }
    return obj2;
}

export const log4state = (state) => {
    if (state === 'info') {
        return colors.blue('i');
    }
    if (state === 'success') {
        return colors.green('√');
    }
    if (state === 'warn') {
        return colors.yellow('‼');
    }
    if (state === 'error') {
        return colors.red('x');
    }
};

export const getYiteNodeModules = (name) => {
    const filePath1 = resolve(appDir, 'node_modules', name);
    const filePath2 = resolve(appDir, '..', 'node_modules', name);
    const filePath3 = resolve(appDir, '..', '..', 'node_modules', name);
    if (existsSync(filePath1) === true) {
        return filePath1;
    } else if (existsSync(filePath2) === true) {
        return filePath2;
    } else if (existsSync(filePath3)) {
        return filePath3;
    }
};
