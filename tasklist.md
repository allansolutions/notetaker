# Task List

<!--
Tasks are managed via Claude Code commands:
- "task add: <description>" - Add a new task
- "task list" - Show all tasks
- "task <number>" - Work on a specific task
- "task done <number>" - Mark a task as completed
-->

## 1. Add configurable task types with account settings screen

**Status:** pending | **Added:** 2026-01-21

Make the task types configurable. We need an account screen where you configure your types—for example, admin, business, personal, etc. All the types we already have would become part of the configurable types. It should also allow me to add a new type, like Notetaker app. For now, we can just focus on adding types. We don't need to think about how we would manage deleting types right now, because that would involve handling what happens to the tasks you previously had with that type.

---

## 2. Add blocked status with required reason dialog

**Status:** pending | **Added:** 2026-01-21

A new status: blocked. When you change the status of a task to blocked, you should be immediately shown a dialogue where you have to state and enter the reason why that task is blocked. When that task moves from being blocked to any other status, you can delete the blocked reason associated with that task.

---

## 3. Migrate to Convex database

**Status:** pending | **Added:** 2026-01-21

Migrate to Convex db - use plan already created

---

## 4. AI-powered daily work schedule generator for calendar

**Status:** pending | **Added:** 2026-01-23

Add functionality to add new entries to the calendar, not Google Calendar, but the app calendar. I could take a look and basically identify the tasks for the day, the priorities, the estimates, the time remaining, and then, based on that, the AI could automatically create the work schedule for me.

---

## 5. User profile system with AI-maintained personality document

**Status:** pending | **Added:** 2026-01-23

The app should have the concept of user accounts. Maybe we can just begin with the user right now, but the app should understand details about the user. It should have a markdown file about the user—everything it understands about the user: its tendencies, its personality, common traits, strengths, weaknesses, way of thinking, and way of working. And this is a constantly living document, and with this it can help make better decisions about what the user should do.

---

## 6. Organization profile with markdown priority document

**Status:** pending | **Added:** 2026-01-23

This should also be the concept of the organisation, and again there should be a Markdown file about the organisation that will help bring clarity to priorities for that specific organisation.

---

## 7. Assigner view with assignee grouping and Slack notifications

**Status:** pending | **Added:** 2026-01-23

It would be very cool to have a feature where you can… There's the concept of assigner and assignee, and then you want the view. Your standard view is that of the assignee. You see the tasks that are assigned to you. But you also want the view of the tasks where you were the assigner and you're not the assignee. And then to group those by the assignee. So you can see these are all the tasks that I assigned to Louisa, and this is what's still pending. You get that same view of date; you can easily see what's past due date, etc. Yeah, I think that would be a pretty convenient way of keeping track of stuff. When creating a task and assigning it to somebody, they should receive a Slack message with the link and the text in line of the task. So user accounts also need to be linked somewhere to a Slack user account. I don't know if that can be some kind of ID, or it just needs to be some kind of key, which is received based on performing authentication, or what that looks like.

Another good use of automated Slack messages is when the assignee changes the status of the task; then the assigner should receive an update via a Slack message.

---

## 8. Category definitions with templates for wiki/playbook entries

**Status:** pending | **Added:** 2026-01-23

Every category should have an accompanying definition. So, if this were a category in the playbook, or in the wiki, and the category were playbook, then you could describe that this is where we have information about standard operating procedures that need to be followed within the company and a common template, even of key fields that are found within such a document.

---
