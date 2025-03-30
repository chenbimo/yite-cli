import { resolve, dirname } from 'node:path';
import { cpSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import pacote from 'pacote';

import { log4state } from '../utils/index.js';
import { fnAppDir } from '../system.js';

async function mainUpdate(options) {
    try {
        const appDir = fnAppDir(options.workdir);
        const updateDir = resolve(appDir, '.cache', 'npm-package');
        const fetchData = await fetch(`https://registry.npmmirror.com/@funpi/admin/latest`);
        const metaData = await fetchData.json();
        await pacote.extract(metaData.dist.tarball, updateDir, {});
        [
            {
                type: 'dir',
                source: resolve(updateDir, 'src', 'pages', 'internal'),
                target: resolve(appDir, 'src', 'pages', 'internal')
            },
            {
                type: 'file',
                source: resolve(updateDir, 'src', 'config', 'internal.js'),
                target: resolve(appDir, 'src', 'config', 'internal.js')
            },
            {
                type: 'file',
                source: resolve(updateDir, 'src', 'utils', 'internal.js'),
                target: resolve(appDir, 'src', 'utils', 'internal.js')
            },
            {
                type: 'file',
                source: resolve(updateDir, 'src', 'styles', 'internal.scss'),
                target: resolve(appDir, 'src', 'styles', 'internal.scss')
            }
        ].forEach((item) => {
            const targetDir = item.type === 'dir' ? item.target : dirname(item.target);

            // 删除目标文件或目录
            if (existsSync(item.target)) {
                rmSync(item.target, { recursive: true, force: true });
            }

            // 创建目标目录
            if (!existsSync(targetDir)) {
                mkdirSync(targetDir, { recursive: true });
            }

            cpSync(item.source, item.target, { recursive: true });
        });
        console.log(log4state('success'), '项目更新成功!');
    } catch (error) {
        console.log('🚀 ~ file: update.js:20 ~ mainUpdate ~ error:', error);
        console.log(log4state('error'), '资源错误或不存在!');
    }
}

export { mainUpdate };
