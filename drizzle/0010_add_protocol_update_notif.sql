-- Add the "protocol_update" value to the notif_category enum so protocol-change
-- notifications (diet / supplements / peptides / workouts) can be inserted.
ALTER TYPE "notif_category" ADD VALUE IF NOT EXISTS 'protocol_update';
