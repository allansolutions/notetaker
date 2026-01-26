import { eq, and, like, asc, isNull } from 'drizzle-orm';
import type { Database } from '../db';
import { companies, type DbCompany, type NewDbCompany } from '../db/schema';

export function generateCompanyId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `company-${timestamp}-${random}`;
}

export async function getCompaniesByUserId(
  db: Database,
  userId: string
): Promise<DbCompany[]> {
  return db
    .select()
    .from(companies)
    .where(and(eq(companies.userId, userId), isNull(companies.deletedAt)))
    .orderBy(asc(companies.name));
}

export async function searchCompanies(
  db: Database,
  userId: string,
  query: string
): Promise<DbCompany[]> {
  return db
    .select()
    .from(companies)
    .where(
      and(eq(companies.userId, userId), like(companies.name, `%${query}%`), isNull(companies.deletedAt))
    )
    .orderBy(asc(companies.name));
}

export async function getCompanyById(
  db: Database,
  companyId: string,
  userId: string
): Promise<DbCompany | undefined> {
  const result = await db
    .select()
    .from(companies)
    .where(and(eq(companies.id, companyId), eq(companies.userId, userId), isNull(companies.deletedAt)))
    .limit(1);

  return result[0];
}

export async function createCompany(
  db: Database,
  userId: string,
  data: Omit<NewDbCompany, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<DbCompany> {
  const id = generateCompanyId();
  const now = Date.now();

  const values: NewDbCompany = {
    id,
    userId,
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(companies).values(values);

  return values as DbCompany;
}

export async function updateCompany(
  db: Database,
  companyId: string,
  userId: string,
  data: Partial<Omit<DbCompany, 'id' | 'userId' | 'createdAt'>>
): Promise<void> {
  await db
    .update(companies)
    .set({
      ...data,
      updatedAt: Date.now(),
    })
    .where(and(eq(companies.id, companyId), eq(companies.userId, userId)));
}

export async function deleteCompany(
  db: Database,
  companyId: string,
  userId: string
): Promise<void> {
  await db
    .update(companies)
    .set({ deletedAt: Date.now() })
    .where(and(eq(companies.id, companyId), eq(companies.userId, userId)));
}
