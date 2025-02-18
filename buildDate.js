import fs from 'fs';
import path from 'path';

const build_date = new Date().toISOString().split('T')[0];

// Đọc package.json
const packageJsonPath = path.join(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

// Kiểm tra nếu build_date đã đúng thì không cần ghi lại
if (packageJson.build_date !== build_date) {
    packageJson.build_date = build_date;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`Build date updated: ${build_date}`);
} else {
    console.log(`Build date is already up-to-date: ${build_date}`);
}
