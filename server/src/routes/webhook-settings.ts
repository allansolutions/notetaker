import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { requireAuth } from '../middleware/auth';
import {
  getWebhookTokensByUserId,
  getWebhookTokenByUserAndProvider,
  createWebhookToken,
  updateWebhookSecret,
  deleteWebhookTokenByProvider,
} from '../services/webhook-tokens';

export const webhookSettingsRoutes = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>();

webhookSettingsRoutes.use('*', requireAuth);

// List all webhook tokens for user
webhookSettingsRoutes.get('/webhooks', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const db = c.get('db');
  const tokens = await getWebhookTokensByUserId(db, userId);

  // Return sanitized token info (don't expose the actual token in list)
  const webhooks = tokens.map((t) => ({
    id: t.id,
    provider: t.provider,
    hasSecret: !!t.webhookSecret,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }));

  return c.json({ webhooks });
});

// Generate new Fathom webhook URL
webhookSettingsRoutes.post('/webhooks/fathom', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const db = c.get('db');

  // Get the API base URL from the request
  const url = new URL(c.req.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  // Check if user already has a Fathom webhook
  const existing = await getWebhookTokenByUserAndProvider(db, userId, 'fathom');
  if (existing) {
    // Return existing webhook URL
    const webhookUrl = `${baseUrl}/api/webhooks/fathom/${userId}/${existing.token}`;
    return c.json({
      webhookUrl,
      id: existing.id,
      hasSecret: !!existing.webhookSecret,
    });
  }

  // Create new webhook token
  const webhookToken = await createWebhookToken(db, userId, 'fathom');

  // Construct webhook URL
  const webhookUrl = `${baseUrl}/api/webhooks/fathom/${userId}/${webhookToken.token}`;

  return c.json(
    {
      webhookUrl,
      id: webhookToken.id,
      hasSecret: false,
    },
    201
  );
});

// Update Fathom webhook secret
webhookSettingsRoutes.put('/webhooks/fathom', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const body = await c.req.json();
  const { secret } = body;

  if (!secret || typeof secret !== 'string') {
    return c.json({ error: 'Secret is required' }, 400);
  }

  const db = c.get('db');

  // Find existing webhook token
  const existing = await getWebhookTokenByUserAndProvider(db, userId, 'fathom');
  if (!existing) {
    return c.json({ error: 'No Fathom webhook configured' }, 404);
  }

  // Update secret
  await updateWebhookSecret(db, existing.id, userId, secret);

  return c.json({ success: true });
});

// Delete Fathom webhook
webhookSettingsRoutes.delete('/webhooks/fathom', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const db = c.get('db');
  await deleteWebhookTokenByProvider(db, userId, 'fathom');

  return c.json({ success: true });
});
