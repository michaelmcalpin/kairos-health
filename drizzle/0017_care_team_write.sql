-- Care-team coaches edit together (product decision, Nov 2026).
-- Until now new shares defaulted to "read" (view only). Those grants become
-- care-team "write"; from here on "read" means an explicit Observer choice.
-- Runs once (drizzle ledger), so later Observer choices are never overwritten.
UPDATE "client_coach_access" SET "diet_access" = 'write' WHERE "diet_access" = 'read';
--> statement-breakpoint
UPDATE "client_coach_access" SET "exercise_access" = 'write' WHERE "exercise_access" = 'read';
--> statement-breakpoint
UPDATE "client_coach_access" SET "labs_access" = 'write' WHERE "labs_access" = 'read';
--> statement-breakpoint
UPDATE "client_coach_access" SET "health_data_access" = 'write' WHERE "health_data_access" = 'read';
