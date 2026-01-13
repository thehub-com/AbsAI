require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API ключ из переменных окружения
const API_KEY = process.env.OPENAI_API_KEY || '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';

// Прокси для OpenAI
app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body;
        
        console.log('📡 Отправка запроса к OpenAI...');
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'Ты - ABS AI, умный ассистент с логотипом трёх оранжевых гор. Отвечай на русском языке. Будь полезным, дружелюбным и информативным.'
                    },
                    ...messages
                ],
                max_tokens: 2000,
                temperature: 0.7
            })
        });

        const data = await response.json();
        
        if (data.error) {
            console.error('❌ OpenAI error:', data.error);
            return res.status(400).json({ error: data.error.message });
        }
        
        res.json(data);
        
    } catch (error) {
        console.error('❌ Server error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Статистика
app.get('/api/stats', (req, res) => {
    res.json({
        status: 'online',
        model: 'GPT-3.5 Turbo',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Все остальные запросы → index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 ABS AI запущен: http://localhost:${PORT}`);
    console.log(`🔑 API Key: ${API_KEY.substring(0, 10)}...`);
});
