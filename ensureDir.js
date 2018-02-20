const fs = require('fs-extra');
const path = require('path');
const argv = process.argv;
if (argv.length < 2) {
    console.log('No path specific.');
    process.exit();
}

const pathName = argv[2];

try {
    const absolutePath = path.join(__dirname, pathName);
    fs.emptyDirSync(absolutePath);
    process.exit();
} catch(error) {
    console.error(error);
    process.exit();
}