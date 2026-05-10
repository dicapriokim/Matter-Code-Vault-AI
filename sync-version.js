const fs = require('fs');
const path = require('path');

// 1. Read package.json (SSOT)
const pkgPath = path.join(__dirname, 'matter_code_vault_HA', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = pkg.version;

console.log(`Syncing version: ${version}`);

// 2. Sync config.yaml
const configPath = path.join(__dirname, 'matter_code_vault_HA', 'config.yaml');
let configContent = fs.readFileSync(configPath, 'utf8');
configContent = configContent.replace(/version: ".*"/, `version: "${version}"`);
fs.writeFileSync(configPath, configContent);
console.log('✔ Sync config.yaml');

// 3. Sync README.md
const readmePath = path.join(__dirname, 'README.md');
let readmeContent = fs.readFileSync(readmePath, 'utf8');
// Replace version in title and subtitle
readmeContent = readmeContent.replace(/HA \(v.*\)/g, `HA (v${version})`);
readmeContent = readmeContent.replace(/Tool \(v.*\)/g, `Tool (v${version})`);
readmeContent = readmeContent.replace(/Key Features \(v.* Update\)/g, `Key Features (v${version} Update)`);
fs.writeFileSync(readmePath, readmeContent);
console.log('✔ Sync README.md');

console.log('Done! Everything is synced to v' + version);
