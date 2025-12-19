-- Move AECB field to confirm_participants_v1 and cleanup AECB_CHECK task

DO $$
DECLARE
  v_schema jsonb;
  v_fields jsonb;
  v_new_fields jsonb := '[]'::jsonb;
  v_elem jsonb;
BEGIN
  -- 1. Update workflow_task_templates for confirm_participants_v1
  -- We take one sample schema to modify. 
  -- Note: There might be duplicates in the table, we'll update all of them to keep them consistent.
  SELECT schema INTO v_schema FROM public.workflow_task_templates WHERE template_id = 'confirm_participants_v1' LIMIT 1;
  
  IF v_schema IS NOT NULL THEN
      v_fields := v_schema->'fields';
      
      FOR v_elem IN SELECT * FROM jsonb_array_elements(v_fields)
      LOOP
        -- Avoid adding duplicate if already exists (idempotency check roughly)
        IF v_elem->>'id' != 'doc_aecb_credit_report' THEN
            v_new_fields := v_new_fields || v_elem;
        END IF;
        
        -- Insert after client_info
        IF v_elem->>'id' = 'client_info' THEN
             v_new_fields := v_new_fields || '{"id": "doc_aecb_credit_report", "type": "file", "label": "AECB Credit Report", "document_type": "aecb_credit_report"}'::jsonb;
        END IF;
      END LOOP;
      
      UPDATE public.workflow_task_templates
      SET schema = jsonb_set(schema, '{fields}', v_new_fields)
      WHERE template_id = 'confirm_participants_v1';
  END IF;

  -- 2. Update active/pending tasks of type CONFIRM_PARTICIPANTS
  -- We will just use the NEW template schema for all active CONFIRM_PARTICIPANTS tasks.
  -- This assumes the template update above was successful and correct.
  
  UPDATE public.tasks
  SET payload = jsonb_set(
        payload, 
        '{schema}', 
        (SELECT schema FROM public.workflow_task_templates WHERE template_id = 'confirm_participants_v1' LIMIT 1)
      )
  WHERE type = 'CONFIRM_PARTICIPANTS' 
    AND status NOT IN ('completed', 'cancelled');


  -- 3. Cancel pending AECB_CHECK tasks
  UPDATE public.tasks
  SET status = 'cancelled'
  WHERE type = 'AECB_CHECK' AND status IN ('pending', 'in_progress', 'new');

END $$;
