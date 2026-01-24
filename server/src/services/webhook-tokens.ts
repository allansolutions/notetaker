import { eq, and } from 'drizzle-orm';
import type { Database } from '../db';
import {
  webhookTokens,
  type DbWebhookToken,
  type NewDbWebhookToken,
} from '../db/schema';

export function generateWebhookTokenId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `wht-${timestamp}-${random}`;
}

export function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function createWebhookToken(
  db: Database,
  userId: string,
  provider: string
): Promise<DbWebhookToken> {
  const id = generateWebhookTokenId();
  const token = generateSecureToken();
  const now = Date.now();

  const values: NewDbWebhookToken = {
    id,
    userId,
    provider,
    token,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(webhookTokens).values(values);

  return values as DbWebhookToken;
}

export async function getWebhookTokensByUserId(
  db: Database,
  userId: string
): Promise<DbWebhookToken[]> {
  return db
    .select()
    .from(webhookTokens)
    .where(eq(webhookTokens.userId, userId));
}

export async function getWebhookTokenByUserAndProvider(
  db: Database,
  userId: string,
  provider: string
): Promise<DbWebhookToken | undefined> {
  const result = await db
    .select()
    .from(webhookTokens)
    .where(
      and(
        eq(webhookTokens.userId, userId),
        eq(webhookTokens.provider, provider)
      )
    )
    .limit(1);

  return result[0];
}

export async function getWebhookTokenByToken(
  db: Database,
  token: string,
  provider: string
): Promise<DbWebhookToken | undefined> {
  const result = await db
    .select()
    .from(webhookTokens)
    .where(
      and(eq(webhookTokens.token, token), eq(webhookTokens.provider, provider))
    )
    .limit(1);

  return result[0];
}

export async function updateWebhookSecret(
  db: Database,
  id: string,
  userId: string,
  secret: string
): Promise<void> {
  await db
    .update(webhookTokens)
    .set({
      webhookSecret: secret,
      updatedAt: Date.now(),
    })
    .where(and(eq(webhookTokens.id, id), eq(webhookTokens.userId, userId)));
}

export async function deleteWebhookToken(
  db: Database,
  id: string,
  userId: string
): Promise<void> {
  await db
    .delete(webhookTokens)
    .where(and(eq(webhookTokens.id, id), eq(webhookTokens.userId, userId)));
}

export async function deleteWebhookTokenByProvider(
  db: Database,
  userId: string,
  provider: string
): Promise<void> {
  await db
    .delete(webhookTokens)
    .where(
      and(
        eq(webhookTokens.userId, userId),
        eq(webhookTokens.provider, provider)
      )
    );
}
