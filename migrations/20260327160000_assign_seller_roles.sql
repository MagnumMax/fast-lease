-- Assign SELLER role to users who are referenced as sellers in deals or have seller_details
INSERT INTO user_roles (user_id, role, portal, created_at, updated_at)
SELECT DISTINCT p.user_id, 'SELLER'::user_role, 'app'::portal_code, now(), now()
FROM profiles p
LEFT JOIN user_roles ur ON p.user_id = ur.user_id AND ur.role = 'SELLER'
WHERE 
  ur.role IS NULL 
  AND (
    (p.seller_details IS NOT NULL AND p.seller_details != '{}'::jsonb)
    OR EXISTS (SELECT 1 FROM deals d WHERE d.seller_id = p.user_id)
  );
