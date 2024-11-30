import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
export function fnDirname(metaUrl) {
    const filename = fileURLToPath(metaUrl);
    return dirname(filename);
}

export function fnCliDir() {
    return join(fnDirname(import.meta.url));
}

export function fnAppDir(workdir) {
    return workdir ? resolve(process.cwd(), workdir) : process.cwd();
}
