import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { getWebhookTokenByToken } from '../services/webhook-tokens';
import {
  verifyWebhookSignature,
  transformTranscriptToBlocks,
  type FathomWebhookPayload,
} from '../services/fathom-webhook';
import { createWikiPage } from '../services/wiki';

export const webhookRoutes = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>();

// Fathom webhook endpoint
// POST /fathom/:userId/:token
webhookRoutes.post('/fathom/:userId/:token', async (c) => {
  const { userId, token } = c.req.param();
  const db = c.get('db');

  // Look up webhook token
  const webhookToken = await getWebhookTokenByToken(db, token, 'fathom');
  if (!webhookToken || webhookToken.userId !== userId) {
    return c.json({ error: 'Invalid webhook token' }, 401);
  }

  // Parse body
  const bodyText = await c.req.text();
  let payload: FathomWebhookPayload;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    return c.json({ error: 'Invalid JSON payload' }, 400);
  }

  // Verify signature if webhook secret is configured
  if (webhookToken.webhookSecret) {
    const webhookId = c.req.header('webhook-id');
    const timestamp = c.req.header('webhook-timestamp');
    const signature = c.req.header('webhook-signature');

    if (!webhookId || !timestamp || !signature) {
      return c.json({ error: 'Missing signature headers' }, 401);
    }

    // Extract the signature value (format: "v1,<signature>")
    const signatureParts = signature.split(',');
    const signatureValue =
      signatureParts.length > 1 ? signatureParts[1] : signatureParts[0];

    const isValid = await verifyWebhookSignature(
      webhookToken.webhookSecret,
      webhookId,
      timestamp,
      bodyText,
      signatureValue
    );

    if (!isValid) {
      return c.json({ error: 'Invalid signature' }, 401);
    }
  }

  // Only process new-meeting-content-ready events
  if (payload.event_name !== 'new-meeting-content-ready') {
    return c.json({ message: 'Event ignored' }, 200);
  }

  // Transform transcript to wiki blocks
  const blocks = transformTranscriptToBlocks(payload);

  // Create wiki page
  const page = await createWikiPage(db, userId, {
    title: payload.title || 'Untitled Call',
    parentId: null,
    icon: '📞',
    type: 'call-notes',
    blocks: JSON.stringify(blocks),
  });

  return c.json({ success: true, pageId: page.id }, 200);
});
