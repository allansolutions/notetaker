import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { requireAuth } from '../middleware/auth';
import {
  getWikiPagesByUserId,
  getWikiPageById,
  getWikiPageBySlug,
  getAncestors,
  createWikiPage,
  updateWikiPage,
  moveWikiPage,
  deleteWikiPage,
} from '../services/wiki';

export const wikiRoutes = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>();

wikiRoutes.use('*', requireAuth);

// Get all wiki pages for user (flat list)
wikiRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const db = c.get('db');
  const pages = await getWikiPagesByUserId(db, userId);

  return c.json({ pages });
});

// Get single page by ID
wikiRoutes.get('/:id', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const pageId = c.req.param('id');
  const db = c.get('db');
  const page = await getWikiPageById(db, pageId, userId);

  if (!page) {
    return c.json({ error: 'Page not found' }, 404);
  }

  return c.json({ page });
});

// Get page by slug
wikiRoutes.get('/slug/:slug', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const slug = c.req.param('slug');
  const db = c.get('db');
  const page = await getWikiPageBySlug(db, slug, userId);

  if (!page) {
    return c.json({ error: 'Page not found' }, 404);
  }

  return c.json({ page });
});

// Get ancestors (breadcrumb chain)
wikiRoutes.get('/:id/ancestors', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const pageId = c.req.param('id');
  const db = c.get('db');

  const page = await getWikiPageById(db, pageId, userId);
  if (!page) {
    return c.json({ error: 'Page not found' }, 404);
  }

  const ancestors = await getAncestors(db, pageId, userId);

  return c.json({ ancestors });
});

// Create page
wikiRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const body = await c.req.json();
  const db = c.get('db');

  try {
    const page = await createWikiPage(db, userId, {
      title: body.title || '',
      parentId: body.parentId || null,
      order: body.order,
      icon: body.icon || null,
      type: body.type || null,
      category: body.category || null,
      tags: body.tags ? JSON.stringify(body.tags) : '[]',
      blocks: body.blocks || '[]',
    });

    return c.json({ page }, 201);
  } catch (error) {
    if (error instanceof Error && error.message.includes('depth')) {
      return c.json({ error: error.message }, 400);
    }
    throw error;
  }
});

// Update page
wikiRoutes.put('/:id', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const pageId = c.req.param('id');
  const body = await c.req.json();
  const db = c.get('db');

  const existingPage = await getWikiPageById(db, pageId, userId);
  if (!existingPage) {
    return c.json({ error: 'Page not found' }, 404);
  }

  const updateData: Record<string, unknown> = {};

  if (body.title !== undefined) updateData.title = body.title;
  if (body.icon !== undefined) updateData.icon = body.icon;
  if (body.type !== undefined) updateData.type = body.type;
  if (body.category !== undefined) updateData.category = body.category;
  if (body.tags !== undefined) updateData.tags = JSON.stringify(body.tags);
  if (body.blocks !== undefined) updateData.blocks = body.blocks;
  if (body.order !== undefined) updateData.order = body.order;

  await updateWikiPage(db, pageId, userId, updateData);

  const updatedPage = await getWikiPageById(db, pageId, userId);

  return c.json({ page: updatedPage });
});

// Move page to new parent
wikiRoutes.put('/:id/move', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const pageId = c.req.param('id');
  const body = await c.req.json();
  const db = c.get('db');

  const existingPage = await getWikiPageById(db, pageId, userId);
  if (!existingPage) {
    return c.json({ error: 'Page not found' }, 404);
  }

  try {
    await moveWikiPage(
      db,
      pageId,
      userId,
      body.parentId ?? null,
      body.order ?? 0
    );

    const updatedPage = await getWikiPageById(db, pageId, userId);

    return c.json({ page: updatedPage });
  } catch (error) {
    if (error instanceof Error) {
      return c.json({ error: error.message }, 400);
    }
    throw error;
  }
});

// Delete page (cascades to children)
wikiRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const pageId = c.req.param('id');
  const db = c.get('db');

  const existingPage = await getWikiPageById(db, pageId, userId);
  if (!existingPage) {
    return c.json({ error: 'Page not found' }, 404);
  }

  await deleteWikiPage(db, pageId, userId);

  return c.json({ success: true });
});
