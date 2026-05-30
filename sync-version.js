const fs = require('fs');
const path = require('path');

// Parse arguments
const args = process.argv.slice(2);
const noBump = args.includes('--no-bump');

// 1. Read package.json (Single Source of Truth)
const pkgPath = path.join(__dirname, 'matter_code_vault_HA', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
let version = pkg.version;

if (!noBump) {
    // Bump patch version (x.y.z -> x.y.(z+1))
    const parts = version.split('.');
    if (parts.length === 3) {
        parts[2] = parseInt(parts[2], 10) + 1;
        version = parts.join('.');
        pkg.version = version;
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
        console.log(`✔ package.json bumped to v${version}`);
    } else {
        console.warn(`⚠️ Invalid version format in package.json: ${version}. Skipping bump.`);
    }
} else {
    console.log(`[Sync] Running without bump. Current version: v${version}`);
}

// 2. Update package-lock.json if it exists
const pkgLockPath = path.join(__dirname, 'matter_code_vault_HA', 'package-lock.json');
if (fs.existsSync(pkgLockPath)) {
    try {
        const pkgLock = JSON.parse(fs.readFileSync(pkgLockPath, 'utf8'));
        pkgLock.version = version;
        if (pkgLock.packages && pkgLock.packages['']) {
            pkgLock.packages[''].version = version;
        }
        fs.writeFileSync(pkgLockPath, JSON.stringify(pkgLock, null, 2) + '\n');
        console.log('✔ package-lock.json updated.');
    } catch (e) {
        console.warn('⚠️ Failed to update package-lock.json:', e.message);
    }
}

// 3. Update config.yaml
const configPath = path.join(__dirname, 'matter_code_vault_HA', 'config.yaml');
if (fs.existsSync(configPath)) {
    let configContent = fs.readFileSync(configPath, 'utf8');
    configContent = configContent.replace(/version: ".*"/, `version: "${version}"`);
    fs.writeFileSync(configPath, configContent);
    console.log('✔ config.yaml updated.');
}

// 4. Update README.md (All occurrences)
const readmePath = path.join(__dirname, 'README.md');
if (fs.existsSync(readmePath)) {
    let readmeContent = fs.readFileSync(readmePath, 'utf8');
    readmeContent = readmeContent.replace(/# Matter Code Vault.* \(v.*\)/g, `# Matter Code Vault AI (v${version})`);
    readmeContent = readmeContent.replace(/> Matter Device Management & QR Code Backup\/Restore Tool \(v.*\)/g, `> Matter Device Management & QR Code Backup/Restore Tool (v${version})`);
    readmeContent = readmeContent.replace(/## 📖 Quick Start Guide \(v.*\)/g, `## 📖 Quick Start Guide (v${version})`);
    readmeContent = readmeContent.replace(/Designed by \*\*돼지지렁이 \(PigWorm\)\*\* v\..*/g, `Designed by **돼지지렁이 (PigWorm)** v.${version}`);
    readmeContent = readmeContent.replace(/## 🏆 Official Release \(v.*\)/g, `## 🏆 Official Release (v${version})`);
    fs.writeFileSync(readmePath, readmeContent);
    console.log('✔ README.md updated.');
}

// 5. Update DOCS.md
const docsPath = path.join(__dirname, 'matter_code_vault_HA', 'DOCS.md');
if (fs.existsSync(docsPath)) {
    let docsContent = fs.readFileSync(docsPath, 'utf8');
    docsContent = docsContent.replace(/# Matter Code Vault AI v.* 사용 가이드/g, `# Matter Code Vault AI v${version} 사용 가이드`);
    docsContent = docsContent.replace(/\*\*Designed by 돼지지렁이\*\* v\..*/g, `**Designed by 돼지지렁이** v.${version}`);
    fs.writeFileSync(docsPath, docsContent);
    console.log('✔ DOCS.md updated.');
}

// 6. Update index.html
const indexPath = path.join(__dirname, 'matter_code_vault_HA', 'public', 'index.html');
if (fs.existsSync(indexPath)) {
    let indexContent = fs.readFileSync(indexPath, 'utf8');
    indexContent = indexContent.replace(/<title>Matter Code Vault.*<\/title>/, `<title>Matter Code Vault AI v${version}</title>`);
    fs.writeFileSync(indexPath, indexContent);
    console.log('✔ index.html title updated.');
}

// 7. Update script.js
const scriptPath = path.join(__dirname, 'matter_code_vault_HA', 'public', 'script.js');
if (fs.existsSync(scriptPath)) {
    let scriptContent = fs.readFileSync(scriptPath, 'utf8');
    scriptContent = scriptContent.replace(/window.APP_VERSION = ".*";/, `window.APP_VERSION = "${version}";`);
    fs.writeFileSync(scriptPath, scriptContent);
    console.log('✔ script.js APP_VERSION updated.');
}

// 8. Update run.sh
const runPath = path.join(__dirname, 'matter_code_vault_HA', 'run.sh');
if (fs.existsSync(runPath)) {
    let runContent = fs.readFileSync(runPath, 'utf8');
    runContent = runContent.replace(/echo "🚀 Matter Code Vault AI \(v.*\)/, `echo "🚀 Matter Code Vault AI (v${version})`);
    fs.writeFileSync(runPath, runContent);
    console.log('✔ run.sh updated.');
}

console.log(`[Sync] Done! All files are now synchronized to v${version}.`);
