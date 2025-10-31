-- Remove legacy overrides for ops-specific workspace pages
DELETE FROM role_access_rules
WHERE section IN ('ops_tasks', 'ops_deals', 'ops_clients', 'ops_cars');
