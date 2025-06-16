const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fetch = require('node-fetch');

dotenv.config();

const app = express();

// CORS configuration
const corsOptions = {
    origin: ['chrome-extension://*', 'moz-extension://*', 'http://localhost:*'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { query, videoData } = req.body;

        if (!query || !videoData) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'HTTP-Referer': process.env.SITE_URL,
                'X-Title': process.env.SITE_NAME
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-4-maverick:free',
                messages: [
                    {
                        role: 'system',
                        content: `You are a helpful AI assistant analyzing a YouTube video. Here's the video context:
                        Title: ${videoData.metadata.title}
                        Channel: ${videoData.metadata.channel}
                        Upload Date: ${videoData.metadata.uploadDate}
                        Description: ${videoData.metadata.description}
                        Tags: ${videoData.metadata.tags.join(', ')}
                        
                        Video Transcript:
                        ${videoData.transcript}
                        
                        Previous conversation:
                        ${videoData.chatHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}`
                    },
                    {
                        role: 'user',
                        content: query
                    }
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('OpenRouter API Error:', error);
            throw new Error(error.error?.message || 'Failed to get response from OpenRouter API');
        }

        const data = await response.json();
        res.json({ response: data.choices[0].message.content });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            error: error.message,
            details: error.stack
        });
    }
});

// For local development
if (process.env.NODE_ENV !== 'production') {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}

// For Vercel
module.exports = app; 