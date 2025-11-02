// This file runs on Vercel's serverless platform (Node.js)

import { env } from 'process';
import { getBody } from '../../utils/getBody'; // Utility to correctly parse the request body

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
        // --- 1. Get the data from the request body ---
        // Note: For simple Vercel projects, req.body might not be automatically parsed,
        // so we'll treat the body handling slightly differently.
        const { idea, style, lighting } = req.body; // Assuming parsing works for simplicity here

        if (!idea) {
            return res.status(400).json({ prompt: "Missing 'idea' in request body" });
        }
        
        // --- 2. Get Key and Endpoint (Switching to Gemini) ---
        const GEMINI_API_KEY = env.GEMINI_API_KEY; // Get key securely from Vercel's env variables
        const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';


        // --- 3. System Prompt (The AI's instruction) ---
        const systemInstruction = `You are the world's best prompt engineer for AI image generators like Midjourney and DALL-E.
        Your job is to expand the user's idea, style, and lighting into a single, incredibly detailed, creative, and vivid visual prompt.
        Only output the final, highly descriptive paragraph prompt.`;

        const userInput = `Idea: ${idea}, Style: ${style}, Lighting: ${lighting}`;

        // --- 4. Call the Gemini API ---
        const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                "contents": [{
                    "role": "user",
                    "parts": [{ "text": systemInstruction + "\n\nUser Input: " + userInput }]
                }],
                "config": {
                    "temperature": 0.8,
                    "maxOutputTokens": 350
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Gemini Error:", errorData);
            return res.status(500).json({ prompt: `Gemini API Error: Check API key, billing, or free tier limit. Details: ${errorData.error ? errorData.error.message : response.statusText}` });
        }

        const data = await response.json();
        const finalPrompt = data.candidates[0].content.parts[0].text.trim() || "Sorry, the AI could not generate a prompt.";

        // --- 5. Send the result back to your WordPress site ---
        return res.status(200).json({ prompt: finalPrompt });


    } catch (error) {
        console.error("Serverless Function Error:", error);
        return res.status(500).json({ prompt: `Internal Server Error. Details: ${error.message}` });
    }
};
