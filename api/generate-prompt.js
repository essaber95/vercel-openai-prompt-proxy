// This file runs on Vercel's serverless platform (Node.js)

import { env } from 'process';

// Function to handle the Vercel serverless request
export default async (req, res) => {
    // 1. Set CORS headers (crucial for connecting to your WordPress site)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle pre-flight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).send();
    }
    
    // Only process POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ prompt: "Method Not Allowed" });
    }

    try {
        const { idea, style, lighting } = req.body;

        if (!idea) {
            return res.status(400).json({ prompt: "Missing 'idea' in request body" });
        }

        // 2. System Prompt (The AI's instruction)
        const systemPrompt = `You are the world's best prompt engineer for AI image generators.
        Your job is to expand the user's idea into a single, incredibly detailed, creative, and vivid visual prompt.
        Only output the final, highly descriptive paragraph prompt.`;

        const userInput = `Idea: ${idea}, Style: ${style}, Lighting: ${lighting}`;

        const OPENAI_API_KEY = env.OPENAI_API_KEY; // Get key securely from Vercel's env variables

        // 3. Call the OpenAI API
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo-0125", // Fastest available Turbo model
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userInput }
                ],
                temperature: 0.8,
                max_tokens: 350
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("OpenAI Error:", errorData);
            // Return an error message indicating a problem with the API key or billing
            return res.status(500).json({ prompt: `OpenAI API Error: Check key or billing: ${errorData.error ? errorData.error.message : response.statusText}` });
        }

        const data = await response.json();
        const finalPrompt = data.choices[0].message.content.trim() || "Sorry, the AI could not generate a prompt.";

        // 4. Send the result back to your WordPress site
        return res.status(200).json({ prompt: finalPrompt });

    } catch (error) {
        console.error("Serverless Function Error:", error);
        return res.status(500).json({ prompt: `Internal Server Error. Details: ${error.message}` });
    }
};
