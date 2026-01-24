/**
 * Migration script to create the initial "Root Innovation" team
 * and migrate all existing users and tasks.
 *
 * Run with: npx ts-node scripts/migrate-to-teams.ts
 *
 * This script:
 * 1. Creates the "Root Innovation" team
 * 2. Adds all existing users as members (first user by createdAt becomes admin)
 * 3. Migrates all tasks to the team with self-assignment
 * 4. Sets the active team for all users
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import {
  users,
  teams,
  teamMembers,
  tasks,
  userSettings,
} from '../src/db/schema';

const TEAM_ID = 'root-innovation';
const TEAM_NAME = 'Root Innovation';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL; // Set this to Chris's email

async function migrate(db: ReturnType<typeof drizzle>) {
  const now = Date.now();

  console.log('Starting migration to teams...');

  // 1. Check if team already exists
  const existingTeam = await db
    .select()
    .from(teams)
    .where(eq(teams.id, TEAM_ID))
    .limit(1);

  if (existingTeam.length > 0) {
    console.log('Team already exists, skipping creation.');
  } else {
    // Create the team
    console.log(`Creating team: ${TEAM_NAME}`);
    await db.insert(teams).values({
      id: TEAM_ID,
      name: TEAM_NAME,
      createdAt: now,
      updatedAt: now,
    });
  }

  // 2. Get all users
  const allUsers = await db.select().from(users);
  console.log(`Found ${allUsers.length} users`);

  // 3. Add users to team if not already members
  for (const user of allUsers) {
    const existingMember = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.userId, user.id))
      .limit(1);

    if (existingMember.length > 0) {
      console.log(`User ${user.email} is already a team member, skipping.`);
      continue;
    }

    // Determine role - admin if matches ADMIN_EMAIL or if it's the first user
    const isAdmin = ADMIN_EMAIL
      ? user.email === ADMIN_EMAIL
      : allUsers.indexOf(user) === 0;

    const memberId = `member-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;

    console.log(`Adding user ${user.email} as ${isAdmin ? 'admin' : 'member'}`);
    await db.insert(teamMembers).values({
      id: memberId,
      teamId: TEAM_ID,
      userId: user.id,
      role: isAdmin ? 'admin' : 'member',
      createdAt: now,
    });
  }

  // 4. Migrate all tasks to the team
  const allTasks = await db.select().from(tasks);
  console.log(`Found ${allTasks.length} tasks to migrate`);

  let migratedCount = 0;
  for (const task of allTasks) {
    // Skip if already has a team
    if (task.teamId) {
      continue;
    }

    await db
      .update(tasks)
      .set({
        teamId: TEAM_ID,
        assigneeId: task.userId, // Self-assign to creator
        updatedAt: now,
      })
      .where(eq(tasks.id, task.id));

    migratedCount++;
  }
  console.log(`Migrated ${migratedCount} tasks to team`);

  // 5. Set active team for all users in settings
  const allSettings = await db.select().from(userSettings);
  console.log(`Found ${allSettings.length} user settings to update`);

  for (const setting of allSettings) {
    if (!setting.activeTeamId) {
      await db
        .update(userSettings)
        .set({
          activeTeamId: TEAM_ID,
          updatedAt: now,
        })
        .where(eq(userSettings.userId, setting.userId));
    }
  }

  // Create settings for users without them
  for (const user of allUsers) {
    const hasSetting = allSettings.some((s) => s.userId === user.id);
    if (!hasSetting) {
      console.log(`Creating settings for user ${user.email}`);
      await db.insert(userSettings).values({
        userId: user.id,
        activeTeamId: TEAM_ID,
        updatedAt: now,
      });
    }
  }

  console.log('Migration complete!');
}

// This script needs to be run in the Cloudflare Workers environment
// or adapted to work with a D1 database connection
console.log(`
================================================================================
MIGRATION SCRIPT FOR TEAMS

This script is designed to run in the Cloudflare Workers environment.
To run it:

1. Run the schema migration first:
   wrangler d1 migrations apply notetaker-db

2. Then run this script via a worker or D1 console:
   - Create a temporary worker endpoint that calls this migration
   - Or run the SQL directly in the D1 console

SQL to run directly:
--------------------------------------------------------------------------------

-- 1. Create the team
INSERT OR IGNORE INTO teams (id, name, created_at, updated_at)
VALUES ('root-innovation', 'Root Innovation', ${Date.now()}, ${Date.now()});

-- 2. Add existing users to team (run for each user, adjust email/role)
-- Check users table first: SELECT * FROM users;
-- Then for each user:
-- INSERT OR IGNORE INTO team_members (id, team_id, user_id, role, created_at)
-- SELECT 'member-' || hex(randomblob(8)), 'root-innovation', id,
--        CASE WHEN email = 'YOUR_ADMIN_EMAIL' THEN 'admin' ELSE 'member' END,
--        ${Date.now()}
-- FROM users;

-- 3. Migrate tasks to team with self-assignment
UPDATE tasks
SET team_id = 'root-innovation',
    assignee_id = user_id,
    updated_at = ${Date.now()}
WHERE team_id IS NULL;

-- 4. Set active team for all users
UPDATE user_settings
SET active_team_id = 'root-innovation',
    updated_at = ${Date.now()}
WHERE active_team_id IS NULL;

-- For users without settings, create them
INSERT OR IGNORE INTO user_settings (user_id, active_team_id, updated_at)
SELECT id, 'root-innovation', ${Date.now()} FROM users;

================================================================================
`);

export { migrate };
