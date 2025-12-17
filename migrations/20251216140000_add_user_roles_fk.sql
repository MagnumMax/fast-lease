ALTER TABLE user_roles
ADD CONSTRAINT user_roles_user_id_fkey_profiles
FOREIGN KEY (user_id)
REFERENCES profiles (user_id)
ON DELETE CASCADE;
