// functions/src/index.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Anthropic from '@anthropic-ai/sdk';

admin.initializeApp();

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface DiagnosisRequest {
  query: string;
  carMake?: string;
  carModel?: string;
  carYear?: number;
  carMileage?: number;
  carFuel?: string;
}

interface DiagnosisResponse {
  title: string;
  system: string;
  description: string;
  danger: 'низкий' | 'средний' | 'высокий';
  danger_reason: string;
  can_drive: boolean;
  urgency?: string;
  price_min: number;
  price_max: number;
  price_comment: string;
  actions: string[];
  parts?: string[];
  error?: string;
}

const SYSTEM_PROMPT = `Ты — Джарвис, ИИ-диагн��ст для автомобилей. Отвечай ТОЛЬКО на русском языке.

Пользователь вводит код ошибки OBD (например, P0301) или описывает симптом.

Ответи строго в JSON формате без markdown, без backticks:
{
  "title": "Короткое название проблемы (до 6 слов)",
  "system": "Система автомобиля (Двигатель / Трансмиссия / Тормоза / Электрика / Подвеска и т.д.)",
  "description": "Понятное объяснение проблемы для обычного человека (2-3 предложения, без технического жаргона)",
  "danger": "низкий" | "средний" | "высокий",
  "danger_reason": "Одно предложение — почему именно такой уровень опасности",
  "can_drive": true | false,
  "urgency": "сегодня" | "3 дня" | "1 неделя" | "1 месяц",
  "price_min": число в рублях (минимум),
  "price_max": число в рублях (максимум),
  "price_comment": "Что входит в стоимость (1 предложение)",
  "actions": ["действие 1", "действие 2", "действие 3"],
  "parts": ["деталь 1", "деталь 2"]
}

Цены давай реалистичные для России 2024 года (региональные сервисы, не дилеры).
Если введён явно не автомобильный запрос — верни { "error": "Это не похоже на автомобильную проблему. Введите код ошибки OBD или опишите симптом." }`;

/**
 * Cloud Function: Диагностика автомобиля (защищённый вызов Claude)
 */
export const analyzeDiagnosis = functions
  .region('us-central1')
  .https.onRequest(async (request, response) => {
    // CORS
    response.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || 'https://localhost:3000');
    response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (request.method === 'OPTIONS') {
      response.status(204).send('');
      return;
    }

    try {
      // Проверка аутентификации
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        response.status(401).json({ error: 'Unauthorized: Missing auth token' });
        return;
      }

      const token = authHeader.substring(7);
      let decodedToken;

      try {
        decodedToken = await admin.auth().verifyIdToken(token);
      } catch (err) {
        response.status(401).json({ error: 'Unauthorized: Invalid token' });
        return;
      }

      const uid = decodedToken.uid;

      // Валидация request body
      const body = request.body as DiagnosisRequest;

      if (!body.query || typeof body.query !== 'string') {
        response.status(400).json({ error: 'Missing or invalid query parameter' });
        return;
      }

      // Rate limiting
      const rateLimitRef = admin.firestore().collection('rate_limits').doc(uid);
      const rateLimitSnap = await rateLimitRef.get();
      const now = Date.now();
      const hour = Math.floor(now / 3600000);

      let count = 0;
      if (rateLimitSnap.exists) {
        const data = rateLimitSnap.data();
        if (data?.hour === hour) {
          count = data.count + 1;
        }
      }

      if (count > 10) {
        response.status(429).json({ error: 'Rate limit exceeded. Max 10 requests per hour.' });
        return;
      }

      await rateLimitRef.set({ hour, count });

      // Логирование
      await admin.firestore().collection('audit_logs').add({
        uid,
        action: 'diagnosis',
        query: body.query,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Контекст для Claude
      const context = [
        `Авто: ${body.carMake || '—'} ${body.carModel || '—'} ${body.carYear || '—'}`,
        body.carMileage ? `Пробег: ${body.carMileage.toLocaleString()} км` : '',
        body.carFuel ? `Топливо: ${body.carFuel}` : '',
      ]
        .filter(Boolean)
        .join(', ');

      const userMessage = context ? `${context}\n\n${body.query}` : body.query;

      // Вызов Claude API
      const diagnosisResult = await Promise.race([
        client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: userMessage,
            },
          ],
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Claude API timeout')), 25000)
        ),
      ]);

      // Парсинг ответа
      const textBlock = diagnosisResult.content.find((block) => block.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No text in Claude response');
      }

      const responseText = textBlock.text.trim();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const diagnosis: DiagnosisResponse = JSON.parse(jsonMatch[0]);

      // Сохранение в Firestore
      await admin
        .firestore()
        .collection('users')
        .doc(uid)
        .collection('diagnostics')
        .add({
          query: body.query,
          result: diagnosis,
          carMake: body.carMake,
          carModel: body.carModel,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

      // Ответ
      response.status(200).json(diagnosis);
    } catch (error) {
      console.error('Error in analyzeDiagnosis:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('Claude')) {
        response.status(503).json({ error: 'AI service temporarily unavailable' });
      } else {
        response.status(500).json({ error: 'Internal server error' });
      }
    }
  });

/**
 * Cloud Function: Советы Джарвиса
 */
export const generateTips = functions
  .region('us-central1')
  .https.onRequest(async (request, response) => {
    response.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || 'https://localhost:3000');
    response.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (request.method === 'OPTIONS') {
      response.status(204).send('');
      return;
    }

    try {
      const authHeader = request.headers.authorization;
      const token = authHeader?.substring(7);

      if (!token) {
        response.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await admin.auth().verifyIdToken(token);

      const { question, carMake, carModel, carYear } = request.body;

      if (!question) {
        response.status(400).json({ error: 'Missing question' });
        return;
      }

      const tipsSystemPrompt = `Ты — Джарвис, автоэксперт-друг. Отвечай ТОЛЬКО на русском.
Дружелюбно, конкретно, без воды. До 4 абзацев максимум.
${carMake && carModel ? `Специально для ${carMake} ${carModel} ${carYear}.` : ''}`;

      const tipsResult = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        system: tipsSystemPrompt,
        messages: [
          {
            role: 'user',
            content: question,
          },
        ],
      });

      const textBlock = tipsResult.content.find((block) => block.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No text in Claude response');
      }

      response.status(200).json({ advice: textBlock.text });
    } catch (error) {
      console.error('Error in generateTips:', error);
      response.status(500).json({ error: 'Failed to generate tips' });
    }
  });

/**
 * Cloud Function: Удаление аккаунта (GDPR)
 */
export const deleteUserAccount = functions
  .region('us-central1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const uid = context.auth.uid;

    try {
      const userRef = admin.firestore().collection('users').doc(uid);
      const subcollections = ['cars', 'expenses', 'fuel_logs', 'diagnostics', 'documents', 'maintenance'];

      for (const subcoll of subcollections) {
        const docs = await userRef.collection(subcoll).listDocuments();
        for (const doc of docs) {
          await doc.delete();
        }
      }

      await userRef.delete();
      await admin.auth().deleteUser(uid);

      console.log(`User ${uid} account deleted`);

      return { success: true, message: 'Account deleted' };
    } catch (error) {
      console.error('Delete account error:', error);
      throw new functions.https.HttpsError('internal', 'Failed to delete account');
    }
  });

/**
 * Cloud Function: Очистка старых логов
 */
export const cleanupOldLogs = functions
  .region('us-central1')
  .pubsub.schedule('0 3 * * 0')
  .timeZone('Europe/Moscow')
  .onRun(async (context) => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const logsRef = admin.firestore().collection('audit_logs');
      const oldLogsSnap = await logsRef.where('timestamp', '<', thirtyDaysAgo).get();

      let deleted = 0;
      for (const doc of oldLogsSnap.docs) {
        await doc.ref.delete();
        deleted++;
      }

      console.log(`Deleted ${deleted} old audit logs`);
      return null;
    } catch (error) {
      console.error('Error in cleanupOldLogs:', error);
      return null;
    }
  });
