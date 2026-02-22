const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const clientDist = path.join(rootDir, 'client', 'dist');
const serverPublic = path.join(rootDir, 'server', 'public');

console.log('--- DEPLOYMENT SCRIPT STARTED ---');
console.log(`Root Dir: ${rootDir}`);
console.log(`Client Dist: ${clientDist}`);
console.log(`Server Public: ${serverPublic}`);

// 1. Verify Client Dist
if (!fs.existsSync(clientDist)) {
    console.error('ERROR: Client dist directory not found!');
    console.error('Ensure "npm run build --prefix client" has run successfully.');
    process.exit(1);
}

// 2. Prepare Server Public
console.log('Cleaning server/public...');
try {
    if (fs.existsSync(serverPublic)) {
        fs.rmSync(serverPublic, { recursive: true, force: true });
    }
    fs.mkdirSync(serverPublic, { recursive: true });
} catch (e) {
    console.error('Failed to clean/create server/public:', e);
    process.exit(1);
}

// 3. Copy Files
console.log('Copying files from client/dist to server/public...');

function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    if (isDirectory) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest);
        }
        fs.readdirSync(src).forEach(childItemName => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

try {
    copyRecursiveSync(clientDist, serverPublic);
    console.log('Copy complete.');
} catch (e) {
    console.error('Copy failed:', e);
    process.exit(1);
}

// 4. Verification
console.log('Verifying server/public contents:');
try {
    const files = fs.readdirSync(serverPublic);
    console.log('Files:', files);
    if (!files.includes('index.html')) {
        console.error('CRITICAL: index.html missing in server/public!');
        process.exit(1);
    } else {
        console.log('SUCCESS: index.html found. Deployment preparation complete.');
    }
} catch (e) {
    console.error('Verification failed:', e);
    process.exit(1);
}

console.log('--- DEPLOYMENT SCRIPT FINISHED ---');
