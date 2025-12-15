-- Drop the existing constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_entity_type_check;

-- Update existing data
UPDATE profiles 
SET entity_type = 'personal' 
WHERE entity_type = 'individual';

-- Add the updated constraint allowing 'personal' instead of 'individual'
ALTER TABLE profiles 
ADD CONSTRAINT profiles_entity_type_check 
CHECK (entity_type = ANY (ARRAY['personal'::text, 'company'::text]));
