require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.post('/api/chat', async (req, res) => {
    try {
        const { query, videoData } = req.body;
        
        const formattedContext = `
            Video Title: ${videoData.metadata.title}
            Channel Name: ${videoData.metadata.channel}
            Upload Date: ${videoData.metadata.uploadDate}
            Description: ${videoData.metadata.description}
            Tags: ${videoData.metadata.tags.join(', ')}
            
            Complete Transcript:
            ${videoData.transcript}
        `;

        const messages = [
            {
                "role": "system",
                "content": "You are a helpful AI assistant that answers questions about YouTube videos based on their transcripts and metadata. Analyze the provided transcript and metadata to give concise, accurate answers that are directly related to the video content. If the information isn't in the video content, acknowledge that. The date is in DD/MM/YYYY format. Don't mention about the metadata or transcript to the user. The user should think you can see the video, so communicate just about the video. Use the following context to answer the user's question:"
            }
        ];

        if (videoData.chatHistory) {
            videoData.chatHistory.forEach(msg => {
                messages.push({
                    role: msg.role,
                    content: msg.content
                });
            });
        }

        messages.push({
            role: "user",
            content: `${formattedContext}\n\nUser Question: ${query}`
        });

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "HTTP-Referer": process.env.SITE_URL,
                "X-Title": process.env.SITE_NAME,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": "meta-llama/llama-3.3-70b-instruct:free",
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 500
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`);
        }

        const data = await response.json();
        res.json({ response: data.choices[0].message.content });
        
    } catch (error) {
        console.error('Error in chat endpoint:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 