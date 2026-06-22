const fs = require('fs');
const path = require('path');

const jsDir = path.join(__dirname, 'src', 'js');
const htmlDir = path.join(__dirname, 'src');
const configContent = `// Archivo de configuración global
window.APP_CONFIG = {
  // Para probar en local, comenta la linea de Render y descomenta la de localhost
  API_URL: 'https://applyai-umuw.onrender.com'
  // API_URL: 'http://localhost:3000'
};
`;

// Crear config.js
const configDir = path.join(jsDir, 'core');
if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
const configPath = path.join(configDir, 'config.js');
fs.writeFileSync(configPath, configContent, 'utf8');
console.log('Creado config.js');

// Reemplazar en JS
function replaceInJsFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            replaceInJsFiles(fullPath);
        } else if (fullPath.endsWith('.js') && file !== 'config.js') {
            let content = fs.readFileSync(fullPath, 'utf8');
            const regex = /(['"`])http:\/\/localhost:3000(.*?)\1/g;
            if (regex.test(content)) {
                const newContent = content.replace(regex, '`${window.APP_CONFIG.API_URL}$2`');
                fs.writeFileSync(fullPath, newContent, 'utf8');
                console.log('Actualizado JS: ' + fullPath);
            }
        }
    }
}
replaceInJsFiles(jsDir);

// Inyectar en HTML
function injectInHtmlFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            injectInHtmlFiles(fullPath);
        } else if (fullPath.endsWith('.html')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (!content.includes('config.js')) {
                // Calcular path relativo
                const relPath = path.relative(path.dirname(fullPath), configPath).replace(/\\/g, '/');
                const scriptTag = `<script src="${relPath}"></script>`;
                
                // Insertar al principio del head
                if (content.includes('<head>')) {
                    content = content.replace('<head>', `<head>\n  ${scriptTag}`);
                } else if (content.includes('<script')) {
                    content = content.replace('<script', `${scriptTag}\n<script`);
                }
                
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Inyectado en HTML: ' + fullPath);
            }
        }
    }
}
injectInHtmlFiles(htmlDir);
console.log('Done!');
