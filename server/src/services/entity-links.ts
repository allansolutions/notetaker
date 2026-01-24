import { eq } from 'drizzle-orm';
import type { Database } from '../db';
import { entityLinks, type DbEntityLink } from '../db/schema';

export async function getEntityLinksByUserId(
  db: Database,
  userId: string
): Promise<DbEntityLink[]> {
  return db.select().from(entityLinks).where(eq(entityLinks.userId, userId));
}
