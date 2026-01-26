import { eq, and, asc, isNull } from 'drizzle-orm';
import type { Database } from '../db';
import {
  contacts,
  companies,
  type DbContact,
  type NewDbContact,
  type DbCompany,
} from '../db/schema';

export function generateContactId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `contact-${timestamp}-${random}`;
}

export interface ContactWithCompany extends DbContact {
  company: DbCompany | null;
}

export async function getContactsByUserId(
  db: Database,
  userId: string
): Promise<ContactWithCompany[]> {
  const result = await db
    .select({
      contact: contacts,
      company: companies,
    })
    .from(contacts)
    .leftJoin(companies, and(eq(contacts.companyId, companies.id), isNull(companies.deletedAt)))
    .where(and(eq(contacts.userId, userId), isNull(contacts.deletedAt)))
    .orderBy(asc(contacts.lastName), asc(contacts.firstName));

  return result.map((row) => ({
    ...row.contact,
    company: row.company,
  }));
}

export async function getContactById(
  db: Database,
  contactId: string,
  userId: string
): Promise<ContactWithCompany | undefined> {
  const result = await db
    .select({
      contact: contacts,
      company: companies,
    })
    .from(contacts)
    .leftJoin(companies, and(eq(contacts.companyId, companies.id), isNull(companies.deletedAt)))
    .where(and(eq(contacts.id, contactId), eq(contacts.userId, userId), isNull(contacts.deletedAt)))
    .limit(1);

  if (result.length === 0) {
    return undefined;
  }

  return {
    ...result[0].contact,
    company: result[0].company,
  };
}

export async function createContact(
  db: Database,
  userId: string,
  data: Omit<NewDbContact, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<DbContact> {
  const id = generateContactId();
  const now = Date.now();

  const values: NewDbContact = {
    id,
    userId,
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(contacts).values(values);

  return values as DbContact;
}

export async function updateContact(
  db: Database,
  contactId: string,
  userId: string,
  data: Partial<Omit<DbContact, 'id' | 'userId' | 'createdAt'>>
): Promise<void> {
  await db
    .update(contacts)
    .set({
      ...data,
      updatedAt: Date.now(),
    })
    .where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)));
}

export async function deleteContact(
  db: Database,
  contactId: string,
  userId: string
): Promise<void> {
  await db
    .update(contacts)
    .set({ deletedAt: Date.now() })
    .where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)));
}
