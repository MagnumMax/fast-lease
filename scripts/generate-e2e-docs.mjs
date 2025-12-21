import fs from 'fs';
import path from 'path';

const E2E_DIR = './e2e';
const OUTPUT_FILE = './docs/e2e_coverage.md';

function generateDocs() {
    console.log('📝 Generating E2E Documentation...');

    const files = fs.readdirSync(E2E_DIR).filter(file => file.endsWith('.spec.ts'));
    let markdown = '# E2E Test Coverage Report\n\n';
    markdown += `*Generated on: ${new Date().toLocaleString()}*\n\n`;

    files.forEach(file => {
        const content = fs.readFileSync(path.join(E2E_DIR, file), 'utf-8');
        const fileName = file.replace('.spec.ts', '');

        // Extract test names
        const testRegex = /test\(['"](.*?)['"]/g;
        const matches = [];
        let match;
        while ((match = testRegex.exec(content)) !== null) {
            matches.push(match[1]);
        }

        if (matches.length > 0) {
            markdown += `## 📄 ${fileName.charAt(0).toUpperCase() + fileName.slice(1).replace(/-/g, ' ')}\n`;
            matches.forEach(testName => {
                const isSmoke = testName.includes('@smoke');
                const cleanName = testName.replace('@smoke', '').trim();
                markdown += `- [${isSmoke ? 'x' : ' '}] ${cleanName}${isSmoke ? ' **(Smoke)**' : ''}\n`;
            });
            markdown += '\n';
        }
    });

    fs.writeFileSync(OUTPUT_FILE, markdown);
    console.log(`✅ Success! Documentation saved to ${OUTPUT_FILE}`);
}

generateDocs();
