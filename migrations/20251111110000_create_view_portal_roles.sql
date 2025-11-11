create or replace view public.view_portal_roles as
select
  ur.user_id,
  ur.role,
  ur.portal,
  ur.assigned_at,
  ur.assigned_by,
  ur.metadata as role_metadata,
  up.status as portal_status,
  up.last_access_at,
  up.metadata as portal_metadata
from public.user_roles ur
left join public.user_portals up
  on up.user_id = ur.user_id
 and up.portal = ur.portal;

comment on view public.view_portal_roles is 'Joins user_roles with user_portals for portal-aware RBAC insights.';
