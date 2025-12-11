-- Make branch_id nullable because some employees don't have a branch
ALTER TABLE attendance ALTER COLUMN branch_id DROP NOT NULL;

-- Make user_id nullable because employees are not in auth.users
ALTER TABLE attendance ALTER COLUMN user_id DROP NOT NULL;
