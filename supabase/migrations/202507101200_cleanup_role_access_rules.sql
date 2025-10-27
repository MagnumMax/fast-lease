-- Remove legacy overrides for non-workspace sections
DELETE FROM role_access_rules
WHERE section NOT LIKE 'workspace_%';
