const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.', '.env') });
const { execSync } = require('child_process');
const which = (process.argv[2] || 'all').toLowerCase();
const cmds = {
    client: process.env.DEPLOY_CLIENT,
    server: process.env.DEPLOY_SERVER
};
if (which === 'all') {
    if (!cmds.client || !cmds.server) {
        console.error('Deploy commands not found');
        process.exit(1);
    }
    try {
        execSync(cmds.client, { stdio: 'inherit', shell: true });
        execSync(cmds.server, { stdio: 'inherit', shell: true });
    } catch (e) { process.exit(e.status || 1); }
} else if (which in cmds) {
    const cmd = cmds[which];
    if (!cmd) {
        console.error(`Missing ${which === 'client' ? 'DEPLOY_CLIENT' : 'DEPLOY_SERVER'} in .env`);
        process.exit(1);
    }
    try {
        execSync(cmd, { stdio: 'inherit', shell: true });
    } catch (e) { process.exit(e.status || 1); }
} else {
    console.error('Usage: npm run deploy (client|server|all)');
    process.exit(2);
}
