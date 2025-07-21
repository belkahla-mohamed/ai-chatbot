const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config(); // Load .env file

const Chat = require('./models/Chat');
const app = express();

app.use(cors());
app.use(express.json());

// ✅ Use env var for MongoDB URI
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB connection error:', err));

app.post('/api/chat', async (req, res) => {
  const { userId, question } = req.body;

  if (!userId || !question) {
    return res.status(400).json({ error: 'userId and question are required' });
  }

  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: question }]
    }, {
      // ✅ Use env var for OpenAI API key
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
    });

    const answer = response.data.choices[0].message.content;

    const chat = new Chat({ userId, question, answer });
    await chat.save();

    res.json({ answer });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: 'Error processing request' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
