-- Create users table
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`google_id` text NOT NULL UNIQUE,
	`email` text NOT NULL UNIQUE,
	`name` text,
	`avatar_url` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);

-- Create tasks table
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
	`type` text NOT NULL DEFAULT 'admin',
	`title` text NOT NULL DEFAULT '',
	`status` text NOT NULL DEFAULT 'todo',
	`importance` text NOT NULL DEFAULT 'mid',
	`blocks` text NOT NULL DEFAULT '[]',
	`scheduled` integer DEFAULT 0,
	`start_time` integer,
	`duration` integer,
	`estimate` integer,
	`due_date` integer,
	`order_index` integer NOT NULL DEFAULT 0,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);

-- Create time_sessions table
CREATE TABLE `time_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL REFERENCES `tasks`(`id`) ON DELETE CASCADE,
	`start_time` integer NOT NULL,
	`end_time` integer,
	`created_at` integer NOT NULL
);

-- Create user_settings table
CREATE TABLE `user_settings` (
	`user_id` text PRIMARY KEY NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
	`theme` text DEFAULT 'system',
	`sidebar_width` integer DEFAULT 320,
	`updated_at` integer NOT NULL
);

-- Create indexes for performance
CREATE INDEX `idx_tasks_user_id` ON `tasks`(`user_id`);
CREATE INDEX `idx_tasks_status` ON `tasks`(`status`);
CREATE INDEX `idx_time_sessions_task_id` ON `time_sessions`(`task_id`);
CREATE INDEX `idx_sessions_user_id` ON `sessions`(`user_id`);
