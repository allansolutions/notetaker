CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`google_access_token` text NOT NULL,
	`google_refresh_token` text,
	`google_token_expiry` integer,
	`google_email` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
