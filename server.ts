import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { google } from 'googleapis';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // ==========================================
  // INITIALIZE AI CLIENT (Groq Only)
  // ==========================================
  const groq = new OpenAI({
    apiKey: process.env.GROK_API_KEY || '', 
    baseURL: "https://api.groq.com/openai/v1",
  });

  // ==========================================
  // GOOGLE FIT SETUP
  // ==========================================
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "http://localhost:3000/api/fit/callback"
  );

  // Load refresh token if it exists in .env
  if (process.env.GOOGLE_REFRESH_TOKEN) {
    oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  }

  // Route 1: Starts the Google login process
  app.get('/api/fit/auth', (req, res) => {
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Forces a Refresh Token
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/fitness.activity.read'],
    });
    res.redirect(url);
  });

  // Route 2: Catches the login, prints the secret token
  app.get('/api/fit/callback', async (req, res) => {
    try {
      const { code } = req.query;
      const { tokens } = await oauth2Client.getToken(code as string);
      
      console.log("\n==============================================");
      console.log("🎉 SUCCESS! ADD THIS TO YOUR .env FILE:");
      console.log(`GOOGLE_REFRESH_TOKEN="${tokens.refresh_token}"`);
      console.log("==============================================\n");
      
      oauth2Client.setCredentials(tokens);
      res.send("Success! Check your VS Code terminal for the Refresh Token, add it to your .env, and restart the server.");
    } catch (error) {
      console.error(error);
      res.status(500).send("Auth failed.");
    }
  });

  // Route 3: Fetches today's steps from Google Fit
  app.post('/api/fit/sync-steps', async (req, res) => {
    try {
      const fitness = google.fitness({ version: 'v1', auth: oauth2Client });
      
      // Get local midnight in milliseconds
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const startTimeMillis = startOfDay.getTime();
      const endTimeMillis = new Date().getTime();

      const response = await fitness.users.dataset.aggregate({
        userId: 'me',
        requestBody: {
          aggregateBy: [{
            dataTypeName: 'com.google.step_count.delta',
            dataSourceId: 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps'
          }],
          bucketByTime: { durationMillis: endTimeMillis - startTimeMillis },
          startTimeMillis,
          endTimeMillis
        }
      });

      // Extract the step count
      const bucket = response.data.bucket?.[0];
      const dataset = bucket?.dataset?.[0];
      const point = dataset?.point?.[0];
      const steps = point?.value?.[0]?.intVal || 0;

      res.json({ steps });
    } catch (error) {
      console.error("Fit API Error:", error);
      res.status(500).json({ error: 'Failed to fetch steps' });
    }
  });

  // ==========================================
  // GROQ ROUTE: Meal Analysis (Vision)
  // ==========================================
  app.post('/api/ai/analyze-meal', async (req, res) => {
    try {
      const { text, image } = req.body;

      const prompt = `Analyze this meal image or description. 
      Return ONLY a JSON object with: calories, protein, carbs, fat, sodium, and a brief description. 
      Format: { "calories": number, "protein": number, "carbs": number, "fat": number, "sodium": number, "description": "string" }`;

      const messages: any[] = [
        {
          role: "user",
          content: [
            { type: "text", text: prompt + (text ? `\n\nUser description: ${text}` : "") },
          ],
        },
      ];

      if (image) {
        messages[0].content.push({
          type: "image_url",
          image_url: {
            url: image,
          },
        });
      }

      const response = await groq.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: messages,
        response_format: { type: "json_object" }
      });

      const responseText = response.choices[0].message.content || "{}";
      res.json(JSON.parse(responseText));
    } catch (error) {
      console.error("Meal Analysis Error:", error);
      res.status(500).json({ error: 'Failed to analyze meal' });
    }
  });

  // ==========================================
  // GROQ ROUTE: Workout Generation
  // ==========================================
  app.post('/api/ai/generate-workout', async (req, res) => {
    try {
      const { userData } = req.body;

      const prompt = `Generate a beginner workout plan for a user with the following data: ${JSON.stringify(userData)}. 
      Return ONLY a JSON object with a list of exercises. Each exercise should have: name, sets, reps, description, and a placeholder imageURL.
      Format: { "planName": "string", "exercises": [{ "name": "string", "sets": "string", "reps": "string", "description": "string", "imageURL": "string" }] }`;

      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: "json_object" }
      });

      const responseText = response.choices[0].message.content || "{}";
      res.json(JSON.parse(responseText));
    } catch (error) {
      console.error("Workout Gen Error:", error);
      res.status(500).json({ error: 'Failed to generate workout' });
    }
  });

  // ==========================================
  // GROQ ROUTE: Daily Report
  // ==========================================
  app.post('/api/ai/daily-report', async (req, res) => {
    try {
      const { userData, dailyStats } = req.body;

      const prompt = `Provide daily feedback for a user. User Data: ${JSON.stringify(userData)}. Today's Stats: ${JSON.stringify(dailyStats)}. 
      Include warnings for low protein or high sodium if applicable. Suggest improvements.
      Return ONLY a JSON object. Format: { "feedback": "string", "warnings": ["string"], "suggestions": ["string"] }`;

      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: "json_object" }
      });

      const responseText = response.choices[0].message.content || "{}";
      res.json(JSON.parse(responseText));
    } catch (error) {
      console.error("Daily Report Error:", error);
      res.status(500).json({ error: 'Failed to generate report' });
    }
  });

  // ==========================================
  // VITE & STATIC FILES
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();