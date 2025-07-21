const mongoose = require('mongoose');
const axios = require('axios');
const Chat = require('../models/Chat');

let conn = null;

async function connectToDatabase() {
    if (conn) return conn;
    if (!process.env.MONGODB_URI) {
        throw new Error('Missing MONGODB_URI environment variable');
    }
    conn = await mongoose.connect(process.env.MONGODB_URI);
    return conn;
}

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // 🔧 Parse raw JSON body
    let body = '';
    for await (const chunk of req) {
        body += chunk;
    }

    let parsed;
    try {
        parsed = JSON.parse(body);
    } catch (err) {
        return res.status(400).json({ error: 'Invalid JSON' });
    }

    const { userId, question } = parsed;

    if (!userId || !question) {
        return res.status(400).json({ error: 'Missing userId or question' });
    }

    if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: 'Missing OPENAI_API_KEY environment variable' });
    }

    try {
        await connectToDatabase();

        const openaiResponse = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: question }]
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const answer = openaiResponse.data.choices?.[0]?.message?.content;

        if (!answer) {
            throw new Error('No answer returned from OpenAI API');
        }

        await Chat.create({ userId, question, answer });

        res.status(200).json({ answer });
    } catch (err) {
        const errorMsg = err.response?.data || err.message || 'Unknown error';
        console.error('❌ Error:', errorMsg);
        res.status(500).json({ error: errorMsg });
    }
};
