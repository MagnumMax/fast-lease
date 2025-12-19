DO $$
DECLARE
    deal_record RECORD;
BEGIN
    -- 1. Delete existing CONFIRM_CAR tasks for NEW deals (only OPEN ones to be safe, though all are OPEN)
    DELETE FROM tasks 
    WHERE type = 'CONFIRM_CAR' 
    AND status = 'OPEN'
    AND deal_id IN (SELECT id FROM deals WHERE status = 'NEW');

    -- 2. Create PREPARE_QUOTE tasks for NEW deals
    FOR deal_record IN SELECT id FROM deals WHERE status = 'NEW' LOOP
        -- Check if task already exists to avoid duplicates if run multiple times
        IF NOT EXISTS (SELECT 1 FROM tasks WHERE deal_id = deal_record.id AND type = 'PREPARE_QUOTE') THEN
            INSERT INTO tasks (
                id,
                deal_id,
                type,
                title,
                status,
                assignee_role,
                payload,
                sla_due_at,
                action_hash,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                deal_record.id,
                'PREPARE_QUOTE',
                'Подписание покупателем коммерческого предложения',
                'OPEN',
                'OP_MANAGER',
                jsonb_build_object(
                    'template_id', 'prepare_quote_v1',
                    'guard_key', 'quotationPrepared',
                    'sla', jsonb_build_object('hours', 8),
                    'schema', jsonb_build_object(
                        'version', '1.0',
                        'fields', jsonb_build_array(
                            jsonb_build_object('id', 'instructions', 'type', 'textarea', 'label', 'Инструкции'),
                            jsonb_build_object('id', 'doc_signed_commercial_offer', 'type', 'file', 'label', 'Коммерческое предложение (подписанное)', 'required', true, 'document_type', 'signed_commercial_offer')
                        )
                    ),
                    'defaults', jsonb_build_object(
                        'instruction_short', 'Загрузите подписанное КП покупателя через задачу. Сам документ формируйте в карточке сделки.',
                        'doc_signed_commercial_offer', ''
                    ),
                    'bindings', jsonb_build_object(
                        'deal_id', deal_record.id::text
                    )
                ),
                NOW() + INTERVAL '8 hours',
                md5('manual_fix_prepare_quote_' || deal_record.id::text),
                NOW(),
                NOW()
            );
        END IF;
    END LOOP;
END $$;
