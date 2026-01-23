import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { requireAuth } from '../middleware/auth';
import {
  getCompaniesByUserId,
  searchCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
} from '../services/companies';

export const companyRoutes = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>();

companyRoutes.use('*', requireAuth);

// Get all companies for user
companyRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const db = c.get('db');
  const companies = await getCompaniesByUserId(db, userId);

  return c.json({ companies });
});

// Search companies by name
companyRoutes.get('/search', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const query = c.req.query('q') || '';
  const db = c.get('db');
  const companies = await searchCompanies(db, userId, query);

  return c.json({ companies });
});

// Get single company
companyRoutes.get('/:id', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const companyId = c.req.param('id');
  const db = c.get('db');
  const company = await getCompanyById(db, companyId, userId);

  if (!company) {
    return c.json({ error: 'Company not found' }, 404);
  }

  return c.json({ company });
});

// Create company
companyRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const body = await c.req.json();
  const db = c.get('db');

  if (!body.name) {
    return c.json({ error: 'name is required' }, 400);
  }

  const company = await createCompany(db, userId, {
    name: body.name,
    street: body.street,
    city: body.city,
    country: body.country,
  });

  return c.json({ company }, 201);
});

// Update company
companyRoutes.put('/:id', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const companyId = c.req.param('id');
  const body = await c.req.json();
  const db = c.get('db');

  const existingCompany = await getCompanyById(db, companyId, userId);
  if (!existingCompany) {
    return c.json({ error: 'Company not found' }, 404);
  }

  const updateData: Record<string, unknown> = {};

  if (body.name !== undefined) updateData.name = body.name;
  if (body.street !== undefined) updateData.street = body.street;
  if (body.city !== undefined) updateData.city = body.city;
  if (body.country !== undefined) updateData.country = body.country;

  await updateCompany(db, companyId, userId, updateData);

  const updatedCompany = await getCompanyById(db, companyId, userId);

  return c.json({ company: updatedCompany });
});

// Delete company
companyRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const companyId = c.req.param('id');
  const db = c.get('db');

  const existingCompany = await getCompanyById(db, companyId, userId);
  if (!existingCompany) {
    return c.json({ error: 'Company not found' }, 404);
  }

  await deleteCompany(db, companyId, userId);

  return c.json({ success: true });
});
