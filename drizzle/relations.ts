import { relations } from "drizzle-orm/relations";
import { users, userDepartmentRoles, departamentos } from "./schema";

export const userDepartmentRolesRelations = relations(userDepartmentRoles, ({one}) => ({
	user_userId: one(users, {
		fields: [userDepartmentRoles.userId],
		references: [users.id],
		relationName: "userDepartmentRoles_userId_users_id"
	}),
	departamento: one(departamentos, {
		fields: [userDepartmentRoles.departmentId],
		references: [departamentos.id]
	}),
	user_leaderUserId: one(users, {
		fields: [userDepartmentRoles.leaderUserId],
		references: [users.id],
		relationName: "userDepartmentRoles_leaderUserId_users_id"
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	userDepartmentRoles_userId: many(userDepartmentRoles, {
		relationName: "userDepartmentRoles_userId_users_id"
	}),
	userDepartmentRoles_leaderUserId: many(userDepartmentRoles, {
		relationName: "userDepartmentRoles_leaderUserId_users_id"
	}),
}));

export const departamentosRelations = relations(departamentos, ({many}) => ({
	userDepartmentRoles: many(userDepartmentRoles),
}));