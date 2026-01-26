import { eq, and, asc, isNull, inArray } from 'drizzle-orm';
import type { Database } from '../db';
import { wikiPages, type DbWikiPage, type NewDbWikiPage } from '../db/schema';

export function generateWikiPageId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `wiki-${timestamp}-${random}`;
}

export function generateSlug(title: string, existingSlugs: string[]): string {
  // Convert to lowercase, replace spaces with hyphens, remove special chars
  let baseSlug = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 100);

  // If empty, use 'untitled'
  if (!baseSlug) {
    baseSlug = 'untitled';
  }

  // Check for uniqueness and add suffix if needed
  let slug = baseSlug;
  let counter = 1;
  while (existingSlugs.includes(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

export async function getWikiPagesByUserId(
  db: Database,
  userId: string
): Promise<DbWikiPage[]> {
  return db
    .select()
    .from(wikiPages)
    .where(and(eq(wikiPages.userId, userId), isNull(wikiPages.deletedAt)))
    .orderBy(asc(wikiPages.order));
}

export async function getWikiPageById(
  db: Database,
  pageId: string,
  userId: string
): Promise<DbWikiPage | undefined> {
  const result = await db
    .select()
    .from(wikiPages)
    .where(and(eq(wikiPages.id, pageId), eq(wikiPages.userId, userId), isNull(wikiPages.deletedAt)))
    .limit(1);

  return result[0];
}

export async function getWikiPageBySlug(
  db: Database,
  slug: string,
  userId: string
): Promise<DbWikiPage | undefined> {
  const result = await db
    .select()
    .from(wikiPages)
    .where(and(eq(wikiPages.slug, slug), eq(wikiPages.userId, userId), isNull(wikiPages.deletedAt)))
    .limit(1);

  return result[0];
}

export async function getWikiPageChildren(
  db: Database,
  parentId: string | null,
  userId: string
): Promise<DbWikiPage[]> {
  if (parentId === null) {
    return db
      .select()
      .from(wikiPages)
      .where(and(eq(wikiPages.userId, userId), isNull(wikiPages.parentId), isNull(wikiPages.deletedAt)))
      .orderBy(asc(wikiPages.order));
  }

  return db
    .select()
    .from(wikiPages)
    .where(and(eq(wikiPages.userId, userId), eq(wikiPages.parentId, parentId), isNull(wikiPages.deletedAt)))
    .orderBy(asc(wikiPages.order));
}

export async function getAncestors(
  db: Database,
  pageId: string,
  userId: string
): Promise<DbWikiPage[]> {
  const ancestors: DbWikiPage[] = [];
  let currentPage = await getWikiPageById(db, pageId, userId);

  while (currentPage && currentPage.parentId) {
    const parent = await getWikiPageById(db, currentPage.parentId, userId);
    if (parent) {
      ancestors.unshift(parent);
      currentPage = parent;
    } else {
      break;
    }
  }

  return ancestors;
}

export async function getDepth(
  db: Database,
  parentId: string | null,
  userId: string
): Promise<number> {
  if (!parentId) {
    return 0;
  }

  const ancestors = await getAncestors(db, parentId, userId);
  return ancestors.length + 1;
}

export async function createWikiPage(
  db: Database,
  userId: string,
  data: Omit<
    NewDbWikiPage,
    'id' | 'userId' | 'slug' | 'createdAt' | 'updatedAt'
  >
): Promise<DbWikiPage> {
  // Check depth limit (max 10 levels)
  if (data.parentId) {
    const depth = await getDepth(db, data.parentId, userId);
    if (depth >= 10) {
      throw new Error('Maximum nesting depth (10 levels) exceeded');
    }
  }

  // Get existing slugs for uniqueness check
  const existingPages = await getWikiPagesByUserId(db, userId);
  const existingSlugs = existingPages.map((p) => p.slug);

  const id = generateWikiPageId();
  const slug = generateSlug(data.title || 'Untitled', existingSlugs);
  const now = Date.now();

  // Get max order for siblings
  const siblings = await getWikiPageChildren(db, data.parentId || null, userId);
  const maxOrder =
    siblings.length > 0 ? Math.max(...siblings.map((s) => s.order)) + 1 : 0;

  const values: NewDbWikiPage = {
    id,
    userId,
    slug,
    ...data,
    order: data.order ?? maxOrder,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(wikiPages).values(values);

  return values as DbWikiPage;
}

export async function updateWikiPage(
  db: Database,
  pageId: string,
  userId: string,
  data: Partial<Omit<DbWikiPage, 'id' | 'userId' | 'createdAt'>>
): Promise<void> {
  // If title is being updated, regenerate slug
  let updateData = { ...data };
  if (data.title !== undefined) {
    const existingPages = await getWikiPagesByUserId(db, userId);
    const existingSlugs = existingPages
      .filter((p) => p.id !== pageId)
      .map((p) => p.slug);
    updateData.slug = generateSlug(data.title || 'Untitled', existingSlugs);
  }

  await db
    .update(wikiPages)
    .set({
      ...updateData,
      updatedAt: Date.now(),
    })
    .where(and(eq(wikiPages.id, pageId), eq(wikiPages.userId, userId)));
}

export async function moveWikiPage(
  db: Database,
  pageId: string,
  userId: string,
  newParentId: string | null,
  newOrder: number
): Promise<void> {
  // Check depth limit if moving to a new parent
  if (newParentId) {
    const depth = await getDepth(db, newParentId, userId);
    if (depth >= 10) {
      throw new Error('Maximum nesting depth (10 levels) exceeded');
    }

    // Prevent moving a page under itself or its descendants
    const page = await getWikiPageById(db, pageId, userId);
    if (page) {
      if (newParentId === pageId) {
        throw new Error('Cannot move page under itself');
      }
      const ancestors = await getAncestors(db, newParentId, userId);
      if (ancestors.some((a) => a.id === pageId)) {
        throw new Error('Cannot move page under its own descendant');
      }
    }
  }

  await db
    .update(wikiPages)
    .set({
      parentId: newParentId,
      order: newOrder,
      updatedAt: Date.now(),
    })
    .where(and(eq(wikiPages.id, pageId), eq(wikiPages.userId, userId)));
}

export async function reorderWikiPages(
  db: Database,
  userId: string,
  pageOrders: { id: string; order: number }[]
): Promise<void> {
  const now = Date.now();
  for (const { id, order } of pageOrders) {
    await db
      .update(wikiPages)
      .set({ order, updatedAt: now })
      .where(and(eq(wikiPages.id, id), eq(wikiPages.userId, userId)));
  }
}

export async function deleteWikiPage(
  db: Database,
  pageId: string,
  userId: string
): Promise<void> {
  const now = Date.now();
  // Collect all descendant IDs iteratively
  const toDelete = [pageId];
  let i = 0;
  while (i < toDelete.length) {
    const children = await db
      .select({ id: wikiPages.id })
      .from(wikiPages)
      .where(and(eq(wikiPages.parentId, toDelete[i]), eq(wikiPages.userId, userId)));
    for (const child of children) {
      toDelete.push(child.id);
    }
    i++;
  }
  // Soft-delete all collected pages
  await db
    .update(wikiPages)
    .set({ deletedAt: now })
    .where(and(inArray(wikiPages.id, toDelete), eq(wikiPages.userId, userId)));
}
