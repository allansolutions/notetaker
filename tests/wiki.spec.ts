import { test, expect, Page } from '@playwright/test';
import { mockAuthenticated, mockTasksApi } from './helpers/auth';

interface WikiPage {
  id: string;
  title: string;
  slug: string;
  parentId: string | null;
  blocks: string;
  order: number;
  icon: string | null;
  type: string | null;
  category: string | null;
  createdAt: number;
  updatedAt: number;
}

let wikiPages: WikiPage[] = [];

async function mockWikiApi(page: Page, initialPages: WikiPage[] = []) {
  wikiPages = [...initialPages];

  // GET all pages
  await page.route('**/api/wiki', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ pages: wikiPages }),
      });
    } else if (route.request().method() === 'POST') {
      const body = JSON.parse(route.request().postData() ?? '{}');
      const now = Date.now();
      const newPage: WikiPage = {
        id: `wiki-${now}`,
        title: body.title || '',
        slug: body.title?.toLowerCase().replace(/\s+/g, '-') || 'untitled',
        parentId: body.parentId || null,
        blocks: body.blocks || '[]',
        order: wikiPages.length,
        icon: body.icon || null,
        type: body.type || null,
        category: body.category || null,
        createdAt: now,
        updatedAt: now,
      };
      wikiPages.push(newPage);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ page: newPage }),
      });
    } else {
      await route.continue();
    }
  });

  // GET/PUT/DELETE single page
  await page.route('**/api/wiki/*', async (route) => {
    const method = route.request().method();
    const url = route.request().url();
    const pageId = url.split('/api/wiki/')[1]?.split('/')[0];

    if (method === 'GET') {
      if (url.includes('/ancestors')) {
        // Get ancestors endpoint
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ancestors: [] }),
        });
      } else {
        const wikiPage = wikiPages.find((p) => p.id === pageId);
        if (wikiPage) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ page: wikiPage }),
          });
        } else {
          await route.fulfill({ status: 404 });
        }
      }
    } else if (method === 'PUT') {
      const body = JSON.parse(route.request().postData() ?? '{}');
      const pageIndex = wikiPages.findIndex((p) => p.id === pageId);
      if (pageIndex !== -1) {
        wikiPages[pageIndex] = {
          ...wikiPages[pageIndex],
          ...body,
          updatedAt: Date.now(),
        };
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ page: wikiPages[pageIndex] }),
        });
      } else {
        await route.fulfill({ status: 404 });
      }
    } else if (method === 'DELETE') {
      wikiPages = wikiPages.filter((p) => p.id !== pageId);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    } else {
      await route.continue();
    }
  });
}

test.describe('Wiki Module', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticated(page);
    await mockTasksApi(page);
    await mockWikiApi(page);
    await page.goto('/');
  });

  test('can navigate to wiki from area switcher', async ({ page }) => {
    // Find and click the area switcher
    const areaSwitcher = page.getByTestId('area-switcher');
    await areaSwitcher.click();

    // Click on Wiki option
    await page.getByRole('option', { name: 'Wiki' }).click();

    // Should see the wiki header
    await expect(page.getByRole('heading', { name: 'Wiki' })).toBeVisible();
  });

  test('shows empty state when no pages exist', async ({ page }) => {
    await page.goto('/wiki');

    // Should show empty state message
    await expect(
      page.getByText('No pages yet. Click + to create one.')
    ).toBeVisible();
  });

  test('can create a new root page', async ({ page }) => {
    await page.goto('/wiki');

    // Click add root page button
    await page.getByTitle('Add root page').click();

    // Should navigate to the new page
    await expect(page).toHaveURL(/\/wiki\/wiki-/);
  });

  test('shows wiki pages in tree', async ({ page }) => {
    // Set up initial pages
    const initialPage: WikiPage = {
      id: 'wiki-1',
      title: 'Test Page',
      slug: 'test-page',
      parentId: null,
      blocks: '[]',
      order: 0,
      icon: null,
      type: null,
      category: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await mockWikiApi(page, [initialPage]);

    await page.goto('/wiki');

    // Should see the page in the tree
    await expect(page.getByText('Test Page')).toBeVisible();
  });

  test('can click on page to view it', async ({ page }) => {
    // Set up initial page
    const initialPage: WikiPage = {
      id: 'wiki-1',
      title: 'My Wiki Page',
      slug: 'my-wiki-page',
      parentId: null,
      blocks: '[]',
      order: 0,
      icon: null,
      type: null,
      category: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await mockWikiApi(page, [initialPage]);

    await page.goto('/wiki');

    // Click on the page
    await page.getByText('My Wiki Page').click();

    // Should navigate to the page detail view
    await expect(page).toHaveURL('/wiki/wiki-1');
  });

  test('shows wiki results in Cmd+P search', async ({ page }) => {
    // Set up initial page with content
    const initialPage: WikiPage = {
      id: 'wiki-1',
      title: 'Meeting Notes',
      slug: 'meeting-notes',
      parentId: null,
      blocks: JSON.stringify([
        { id: 'b1', type: 'paragraph', content: 'Important meeting' },
      ]),
      order: 0,
      icon: '📝',
      type: 'meeting-notes',
      category: 'business-dev',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Need to set up mocks fresh for this test to include the wiki page
    await mockAuthenticated(page);
    await mockTasksApi(page);
    await mockWikiApi(page, [initialPage]);

    await page.goto('/');

    // Wait for app to fully load
    await page.waitForSelector('[data-testid="sidebar"]');

    // Open search with Cmd+K
    await page.keyboard.press('Meta+k');

    // Should show the dialog
    await expect(page.getByRole('dialog')).toBeVisible();

    // Type search query
    await page.getByPlaceholder(/Search commands, tasks/i).fill('meeting');

    // Should show the wiki page in results
    await expect(page.getByText('Meeting Notes')).toBeVisible();
    await expect(page.getByText('Page')).toBeVisible(); // Type indicator
  });
});
