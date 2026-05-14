const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI('AIzaSyAEBOEIC9JK8puh9xQUvfSifnYk3vT0864');
genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }).generateContent('hello').then(res => console.log(res.response.text())).catch(err => console.error(err.message));
