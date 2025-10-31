-- Drop temporary workflow task failures helper table if it exists
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'workflow_task_failures'
  ) then
    drop table public.workflow_task_failures;
  end if;
end $$;
