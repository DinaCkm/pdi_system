-- Create user_department_roles table for dual profile support
CREATE TABLE `user_department_roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`departmentId` int NOT NULL,
	`assignmentType` enum('LEADER','MEMBER') NOT NULL,
	`leaderUserId` int,
	`status` enum('ativo','inativo') NOT NULL DEFAULT 'ativo',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_department_roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_department_roles_userId_departmentId_unique` UNIQUE(`userId`,`departmentId`),
	CONSTRAINT `user_department_roles_userId_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
	CONSTRAINT `user_department_roles_departmentId_fk` FOREIGN KEY (`departmentId`) REFERENCES `departamentos`(`id`) ON DELETE CASCADE,
	CONSTRAINT `user_department_roles_leaderUserId_fk` FOREIGN KEY (`leaderUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

-- Add indexes for performance
CREATE INDEX `user_department_roles_userId_idx` ON `user_department_roles`(`userId`);
CREATE INDEX `user_department_roles_departmentId_idx` ON `user_department_roles`(`departmentId`);
CREATE INDEX `user_department_roles_leaderUserId_idx` ON `user_department_roles`(`leaderUserId`);
CREATE INDEX `user_department_roles_assignmentType_idx` ON `user_department_roles`(`assignmentType`);
