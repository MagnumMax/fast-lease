-- Create portal_code enum to tag audiences and portals
create type public.portal_code as enum ('app', 'investor', 'client', 'partner');
