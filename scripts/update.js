import path from 'path';
import fs from 'fs-extra';
import pacote from 'pacote';

import { log4state } from '../utils/index.js';
import { fnAppDir } from '../system.js';

async function mainUpdate(options) {
    try {
        const appDir = fnAppDir(options.workdir);
        const updateDir = path.resolve(appDir, '.cache', 'npm-package');
        const fetchData = await fetch(`https://registry.npmmirror.com/@funpi/admin/latest`);
        const metaData = await fetchData.json();
        await pacote.extract(metaData.dist.tarball, updateDir, {});
        [
            {
                type: 'dir',
                source: path.resolve(updateDir, 'src', 'pages', 'internal'),
                target: path.resolve(appDir, 'src', 'pages', 'internal')
            },
            {
                type: 'file',
                source: path.resolve(updateDir, 'src', 'config', 'internal.js'),
                target: path.resolve(appDir, 'src', 'config', 'internal.js')
            },
            {
                type: 'file',
                source: path.resolve(updateDir, 'src', 'utils', 'internal.js'),
                target: path.resolve(appDir, 'src', 'utils', 'internal.js')
            },
            {
                type: 'file',
                source: path.resolve(updateDir, 'src', 'styles', 'internal.scss'),
                target: path.resolve(appDir, 'src', 'styles', 'internal.scss')
            }
        ].forEach((item) => {
            if (item.type === 'dir') {
                fs.copySync(item.source, item.target);
                fs.ensureDirSync(item.source);
            }
        });
        console.log(log4state('success'), '项目更新成功!');
    } catch (error) {
        console.log('🚀 ~ file: update.js:20 ~ mainUpdate ~ error:', error);
        console.log(log4state('error'), '资源错误或不存在!');
    }
}

export { mainUpdate };
