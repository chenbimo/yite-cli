import { build } from 'vite';
import path from 'path';
import { fnCliDir } from '../system.js';

async function mainBuild(options) {
    await build({
        configFile: path.resolve(fnCliDir(), 'vite.config.js')
    });
}

export { mainBuild };
