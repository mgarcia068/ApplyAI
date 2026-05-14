const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI('AIzaSyAEBOEIC9JK8puh9xQUvfSifnYk3vT0864');
fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyAEBOEIC9JK8puh9xQUvfSifnYk3vT0864`).then(r => r.json()).then(console.log).catch(console.error);
