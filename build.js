const fg = require('fast-glob');
const fs = require('fs-extra');
const path = require('path');
(async() => {
    const srcRoot = path.join(__dirname, '.', 'server');
    const dstRoot = path.join(__dirname, '.', 'server', 'dist');
    await fs.remove(dstRoot);
    await fs.ensureDir(dstRoot);
    const entries = await fg(['**/*'], {
        cwd: srcRoot,
        dot: true,
        onlyFiles: true,
        ignore: [
            '**/.git/**',
            '**/*.env',
            '**/.env*',
            '**/*.db*',
            'tmp/**'
        ]
    });
    for (const rel of entries) {
        const src = path.join(srcRoot, rel);
        const dst = path.join(dstRoot, rel);
        await fs.ensureDir(path.dirname(dst));
        await fs.copyFile(src, dst);
    }
    console.log(`Built server/dist with ${entries.length} files (dotfiles included, .git excluded).`);
})();
