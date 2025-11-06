create or replace function public.normalize_emirates_plate(input text)
returns text
language plpgsql
as $function$
declare
  cleaned text;
  matches text[];
begin
  if input is null then
    return null;
  end if;

  cleaned := upper(input);
  cleaned := translate(cleaned, '٠١٢٣٤٥٦٧٨٩', '0123456789');
  cleaned := regexp_replace(cleaned, '(DUBAI|ABU\s*DHABI|PRIVATE|PLATE|LICENSE|VEHICLE|CAR|NUMBER|NO|TBA)', ' ', 'gi');
  cleaned := regexp_replace(cleaned, '[^A-Z0-9]', ' ', 'g');
  cleaned := regexp_replace(cleaned, '\s+', ' ', 'g');
  cleaned := trim(cleaned);

  if cleaned = '' then
    return null;
  end if;

  matches := regexp_matches(cleaned, '^([A-Z]{1,3})\s+(\d{1,6})$');
  if matches is not null then
    return matches[1] || ' ' || matches[2];
  end if;

  matches := regexp_matches(cleaned, '^([A-Z]{1,3})(\d{1,6})$');
  if matches is not null then
    return matches[1] || ' ' || matches[2];
  end if;

  matches := regexp_matches(cleaned, '^(\d{3,6})\s+([A-Z]{1,3})$');
  if matches is not null then
    return matches[2] || ' ' || matches[1];
  end if;

  matches := regexp_matches(cleaned, '^(\d{3,6})([A-Z]{1,3})$');
  if matches is not null then
    return matches[2] || ' ' || matches[1];
  end if;

  matches := regexp_matches(cleaned, '^(\d{1,2})\s+(\d{3,6})$');
  if matches is not null then
    return matches[1] || ' ' || matches[2];
  end if;

  matches := regexp_matches(cleaned, '^(\d{1,2})(\d{3,6})$');
  if matches is not null then
    return matches[1] || ' ' || matches[2];
  end if;

  return cleaned;
end;
$function$;

update public.vehicles
set license_plate = public.normalize_emirates_plate(license_plate)
where license_plate is not null;
