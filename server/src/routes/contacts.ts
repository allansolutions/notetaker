import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { requireAuth } from '../middleware/auth';
import {
  getContactsByUserId,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
} from '../services/contacts';
import { createCompany, getCompanyById } from '../services/companies';

export const contactRoutes = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>();

contactRoutes.use('*', requireAuth);

// Get all contacts for user (with company joined)
contactRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const db = c.get('db');
  const contacts = await getContactsByUserId(db, userId);

  return c.json({ contacts });
});

// Get single contact
contactRoutes.get('/:id', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const contactId = c.req.param('id');
  const db = c.get('db');
  const contact = await getContactById(db, contactId, userId);

  if (!contact) {
    return c.json({ error: 'Contact not found' }, 404);
  }

  return c.json({ contact });
});

// Create contact
contactRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const body = await c.req.json();
  const db = c.get('db');

  if (!body.firstName || !body.lastName) {
    return c.json({ error: 'firstName and lastName are required' }, 400);
  }

  // Handle company creation if newCompanyName is provided
  let companyId = body.companyId;
  if (body.newCompanyName && !companyId) {
    const newCompany = await createCompany(db, userId, {
      name: body.newCompanyName,
    });
    companyId = newCompany.id;
  }

  const contact = await createContact(db, userId, {
    firstName: body.firstName,
    lastName: body.lastName,
    email: body.email,
    phone: body.phone,
    linkedIn: body.linkedIn,
    instagram: body.instagram,
    street: body.street,
    city: body.city,
    country: body.country,
    companyId,
  });

  // Fetch the contact with company for response
  const contactWithCompany = await getContactById(db, contact.id, userId);

  return c.json({ contact: contactWithCompany }, 201);
});

// Update contact
contactRoutes.put('/:id', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const contactId = c.req.param('id');
  const body = await c.req.json();
  const db = c.get('db');

  const existingContact = await getContactById(db, contactId, userId);
  if (!existingContact) {
    return c.json({ error: 'Contact not found' }, 404);
  }

  // Handle company creation if newCompanyName is provided
  let companyId = body.companyId;
  if (body.newCompanyName && !companyId) {
    const newCompany = await createCompany(db, userId, {
      name: body.newCompanyName,
    });
    companyId = newCompany.id;
  }

  const updateData: Record<string, unknown> = {};

  if (body.firstName !== undefined) updateData.firstName = body.firstName;
  if (body.lastName !== undefined) updateData.lastName = body.lastName;
  if (body.email !== undefined) updateData.email = body.email;
  if (body.phone !== undefined) updateData.phone = body.phone;
  if (body.linkedIn !== undefined) updateData.linkedIn = body.linkedIn;
  if (body.instagram !== undefined) updateData.instagram = body.instagram;
  if (body.street !== undefined) updateData.street = body.street;
  if (body.city !== undefined) updateData.city = body.city;
  if (body.country !== undefined) updateData.country = body.country;
  if (companyId !== undefined) updateData.companyId = companyId;

  await updateContact(db, contactId, userId, updateData);

  const updatedContact = await getContactById(db, contactId, userId);

  return c.json({ contact: updatedContact });
});

// Delete contact
contactRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const contactId = c.req.param('id');
  const db = c.get('db');

  const existingContact = await getContactById(db, contactId, userId);
  if (!existingContact) {
    return c.json({ error: 'Contact not found' }, 404);
  }

  await deleteContact(db, contactId, userId);

  return c.json({ success: true });
});
