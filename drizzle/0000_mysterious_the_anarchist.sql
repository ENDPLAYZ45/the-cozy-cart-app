CREATE TABLE `analytics_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`visitorId` varchar(64) NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`eventType` enum('page_view','search','category_interest') NOT NULL,
	`route` varchar(128) NOT NULL,
	`category` varchar(100),
	`searchTerm` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analytics_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE INDEX `analytics_events_created_at_idx` ON `analytics_events` (`createdAt`);--> statement-breakpoint
CREATE INDEX `analytics_events_visitor_idx` ON `analytics_events` (`visitorId`);--> statement-breakpoint
CREATE INDEX `analytics_events_event_type_created_idx` ON `analytics_events` (`eventType`,`createdAt`);--> statement-breakpoint
CREATE INDEX `analytics_events_category_idx` ON `analytics_events` (`category`);