import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { google } from 'googleapis';

dotenv.config({ path: '.env.local' });
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── SIMPLE IN-MEMORY RATE LIMITER ───────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function rateLimit(maxReq: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip ?? 'unknown';
    const now = Date.now();
    const entry = rateLimitMap.get(key);
    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (entry.count >= maxReq) {
      return res.status(429).json({ error: 'Too many requests. Please slow down.' });
    }
    entry.count++;
    next();
  };
}
const aiLimit = rateLimit(30, 60_000); // 30 AI calls per minute per IP

// ─── SAFE JSON PARSE ──────────────────────────────────────────────────────────
function safeParseJSON(text: string, fallback: object = {}) {
  try {
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return fallback;
  }
}

// ─── INPUT VALIDATORS ─────────────────────────────────────────────────────────
function validateMealBody(body: unknown): { ok: true; text?: string; image?: string } | { ok: false; error: string } {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'Invalid body' };
  const b = body as Record<string, unknown>;
  if (b.text !== undefined && typeof b.text !== 'string') return { ok: false, error: 'text must be a string' };
  if (b.text && (b.text as string).length > 2000) return { ok: false, error: 'text too long' };
  if (b.image !== undefined) {
    if (typeof b.image !== 'string') return { ok: false, error: 'image must be a base64 string' };
    if ((b.image as string).length > 7_000_000) return { ok: false, error: 'Image too large (max ~5MB)' };
    if (!(b.image as string).startsWith('data:image/')) return { ok: false, error: 'image must be a data URI' };
  }
  return { ok: true, text: b.text as string | undefined, image: b.image as string | undefined };
}

// ─── MAIN SERVER ──────────────────────────────────────────────────────────────
async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT ?? 3000);

  app.use(express.json({ limit: '10mb' }));

  // ── Groq client ──────────────────────────────────────────────────────────────
  const groq = new OpenAI({
    apiKey: process.env.GROK_API_KEY ?? '',
    baseURL: 'https://api.groq.com/openai/v1',
  });

  // ── Google Fit OAuth ──────────────────────────────────────────────────────────
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `http://localhost:${PORT}/api/fit/callback`,
  );
  if (process.env.GOOGLE_REFRESH_TOKEN) {
    oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  }

  // ─── GOOGLE FIT ROUTES ───────────────────────────────────────────────────────

  app.get('/api/fit/auth', (_req, res) => {
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/fitness.activity.read'],
    });
    res.redirect(url);
  });

  app.get('/api/fit/callback', async (req, res) => {
    try {
      const { code } = req.query;
      if (typeof code !== 'string') return res.status(400).send('Missing code');
      const { tokens } = await oauth2Client.getToken(code);
      console.log('\n==============================================');
      console.log('🎉 SUCCESS! Add this to your .env.local:');
      console.log(`GOOGLE_REFRESH_TOKEN="${tokens.refresh_token}"`);
      console.log('==============================================\n');
      oauth2Client.setCredentials(tokens);
      res.send('Success! Check your terminal for the Refresh Token, add it to .env.local, then restart.');
    } catch (err) {
      console.error('OAuth callback error:', err);
      res.status(500).send('Authentication failed.');
    }
  });

  app.post('/api/fit/sync-steps', async (_req, res) => {
    try {
      const fitness = google.fitness({ version: 'v1', auth: oauth2Client });
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const startTimeMillis = startOfDay.getTime();
      const endTimeMillis = Date.now();

      const response = await fitness.users.dataset.aggregate({
        userId: 'me',
        requestBody: {
          aggregateBy: [{
            dataTypeName: 'com.google.step_count.delta',
            dataSourceId: 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps',
          }],
          bucketByTime: { durationMillis: endTimeMillis - startTimeMillis },
          startTimeMillis,
          endTimeMillis,
        },
      });

      const steps = response.data.bucket?.[0]?.dataset?.[0]?.point?.[0]?.value?.[0]?.intVal ?? 0;
      res.json({ steps });
    } catch (err) {
      console.error('Fit API error:', err);
      res.status(500).json({ error: 'Failed to fetch steps from Google Fit' });
    }
  });

  // ─── AI ROUTES ───────────────────────────────────────────────────────────────

  // POST /api/ai/analyze-meal
  app.post('/api/ai/analyze-meal', aiLimit, async (req, res) => {
    const validated = validateMealBody(req.body);
    if (!validated.ok) return res.status(400).json({ error: validated.error });

    const { text, image } = validated;
    if (!text?.trim() && !image) {
      return res.status(400).json({ error: 'Provide a text description or an image.' });
    }

    try {
      const content: any[] = [
        {
          type: 'text',
          text: `Analyze this meal and return ONLY a JSON object with exactly these keys:
{ "calories": number, "protein": number, "carbs": number, "fat": number, "sodium": number, "description": string }
All numbers are per the full meal shown. No markdown, no extra keys.
${text ? `User description: ${text}` : ''}`,
        },
      ];

      if (image) {
        content.push({ type: 'image_url', image_url: { url: image } });
      }

      const response = await groq.chat.completions.create({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [{ role: 'user', content }],
        response_format: { type: 'json_object' },
        max_tokens: 300,
      });

      const parsed = safeParseJSON(
        response.choices[0]?.message?.content ?? '{}',
        { calories: 0, protein: 0, carbs: 0, fat: 0, sodium: 0, description: text ?? 'Unknown meal' },
      );
      res.json(parsed);
    } catch (err) {
      console.error('Meal analysis error:', err);
      res.status(500).json({ error: 'Failed to analyze meal. Please try again.' });
    }
  });

  // POST /api/ai/generate-workout
  app.post('/api/ai/generate-workout', aiLimit, async (req, res) => {
    const { userData } = req.body ?? {};
    if (!userData || typeof userData !== 'object') {
      return res.status(400).json({ error: 'Missing userData' });
    }

    const { gymLevel = 'beginner', goal = 'maintain', weight = 70, age = 25 } = userData;

    try {
      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{
          role: 'user',
          content: `Generate a ${gymLevel} gym workout plan for a user:
- Age: ${age}, Weight: ${weight}kg, Goal: ${goal}
Return ONLY valid JSON with this exact shape (no markdown):
{
  "planName": string,
  "exercises": [
    { "name": string, "muscle": string, "sets": string, "reps": string, "description": string }
  ]
}
Include 6-8 exercises. muscle must be one of: Chest, Shoulders, Triceps, Back, Biceps, Legs, Core.`,
        }],
        response_format: { type: 'json_object' },
        max_tokens: 800,
      });

      const parsed = safeParseJSON(
        response.choices[0]?.message?.content ?? '{}',
        { planName: 'AI Custom Plan', exercises: [] },
      );
      res.json(parsed);
    } catch (err) {
      console.error('Workout generation error:', err);
      res.status(500).json({ error: 'Failed to generate workout plan.' });
    }
  });

  // POST /api/ai/daily-report
  app.post('/api/ai/daily-report', aiLimit, async (req, res) => {
    const { userData, dailyStats } = req.body ?? {};
    if (!userData || !dailyStats) {
      return res.status(400).json({ error: 'Missing userData or dailyStats' });
    }

    try {
      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{
          role: 'user',
          content: `Give a personalized daily health feedback for this user.
User: ${JSON.stringify(userData)}
Today's stats: ${JSON.stringify(dailyStats)}

Rules:
- Warn if calories < 80% or > 110% of target
- Warn if protein < 80% of target
- Warn if sodium > 2300mg
- Be encouraging, specific, and brief

Return ONLY valid JSON (no markdown):
{ "feedback": string, "warnings": string[], "suggestions": string[] }`,
        }],
        response_format: { type: 'json_object' },
        max_tokens: 500,
      });

      const parsed = safeParseJSON(
        response.choices[0]?.message?.content ?? '{}',
        { feedback: 'Keep going!', warnings: [], suggestions: [] },
      );
      res.json(parsed);
    } catch (err) {
      console.error('Daily report error:', err);
      res.status(500).json({ error: 'Failed to generate daily report.' });
    }
  });

  // ─── VITE / STATIC ───────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Server running at http://localhost:${PORT}`);
    console.log(`   AI model: Groq / llama-3.3-70b-versatile`);
    console.log(`   Google Fit: ${process.env.GOOGLE_REFRESH_TOKEN ? '✅ Connected' : '⚠️  Not connected — visit /api/fit/auth'}\n`);
  });
}

startServer();