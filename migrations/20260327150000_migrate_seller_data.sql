DO $$
DECLARE
    r RECORD;
    seller_task RECORD;
    s_email TEXT;
    s_phone TEXT;
    s_bank TEXT;
    s_name TEXT;
    current_user_id UUID;
    profile_pk UUID;
    doc_fields JSONB;
    doc_key TEXT;
    doc_path TEXT;
    doc_type TEXT;
    s_type TEXT;
    existing_user_id UUID;
BEGIN
    -- Iterate over deals that might need seller migration
    FOR r IN SELECT * FROM deals LOOP
        -- Attempt to find the COLLECT_SELLER_DOCS task for this deal
        SELECT * INTO seller_task FROM tasks 
        WHERE type IN ('COLLECT_SELLER_DOCS_COMPANY', 'COLLECT_SELLER_DOCS_INDIVIDUAL')
        AND id::text = (r.payload->'tasks'->'docs_seller_allUploaded'->>'task_id');
        
        -- Second try
        IF seller_task IS NULL THEN
            SELECT * INTO seller_task FROM tasks
            WHERE type IN ('COLLECT_SELLER_DOCS_COMPANY', 'COLLECT_SELLER_DOCS_INDIVIDUAL')
            AND (payload->'fields'->>'deal_id' = r.id::text)
            LIMIT 1;
        END IF;

        IF seller_task IS NULL THEN
            CONTINUE;
        END IF;

        -- Extract seller data
        s_email := seller_task.payload->'fields'->>'seller_contact_email';
        s_phone := seller_task.payload->'fields'->>'seller_contact_phone';
        s_bank := seller_task.payload->'fields'->>'seller_bank_details';
        s_type := CASE WHEN seller_task.type = 'COLLECT_SELLER_DOCS_COMPANY' THEN 'company' ELSE 'individual' END;
        
        -- Determine Seller Name
        s_name := 'Seller ' || substring(r.id::text, 1, 8);
        doc_fields := seller_task.payload->'fields';
        FOR doc_key IN SELECT jsonb_object_keys(doc_fields) LOOP
             doc_path := doc_fields->>doc_key;
             IF doc_path IS NOT NULL AND doc_path != '' AND doc_path ~ '[0-9]+-[0-9\.]*-?(.+)\.[a-zA-Z]+$' THEN
                 s_name := substring(doc_path from '[0-9]+-[0-9\.]*-?(.+)\.[a-zA-Z]+$');
                 s_name := replace(s_name, '-', ' ');
                 s_name := replace(s_name, '_', ' ');
                 EXIT; 
             END IF;
        END LOOP;
        
        IF s_name LIKE 'Seller %' AND s_email IS NOT NULL AND position('@' in s_email) > 0 THEN
             s_name := substring(s_email from 1 for position('@' in s_email) - 1);
        END IF;

        IF s_email IS NULL OR s_email = '' THEN
            s_email := 'seller-' || substring(r.id::text, 1, 8) || '@placeholder.fastlease.ae';
        END IF;

        -- Create or Update Profile
        IF r.seller_id IS NOT NULL THEN
            -- Update existing profile
            current_user_id := r.seller_id;
            UPDATE profiles SET 
                entity_type = s_type,
                seller_details = jsonb_build_object(
                    'seller_contact_email', s_email,
                    'seller_contact_phone', s_phone,
                    'seller_bank_details', s_bank
                ),
                updated_at = now()
            WHERE user_id = current_user_id
            RETURNING id INTO profile_pk;
            
            -- If update returned nothing (user_id not found?), try to find just in case
            IF profile_pk IS NULL THEN
                 SELECT id INTO profile_pk FROM profiles WHERE user_id = current_user_id;
            END IF;
        ELSE
            -- Create new profile
            SELECT id INTO existing_user_id FROM auth.users WHERE email = s_email;
            
            IF existing_user_id IS NOT NULL THEN
                current_user_id := existing_user_id;
            ELSE
                current_user_id := gen_random_uuid();
                INSERT INTO auth.users (id, email, aud, role, created_at, updated_at, email_confirmed_at)
                VALUES (
                    current_user_id,
                    s_email,
                    'authenticated',
                    'authenticated',
                    now(),
                    now(),
                    now()
                );
            END IF;
            
            INSERT INTO profiles (user_id, full_name, entity_type, seller_details, status, created_at, updated_at)
            VALUES (
                current_user_id, 
                s_name, 
                s_type, 
                jsonb_build_object(
                    'seller_contact_email', s_email,
                    'seller_contact_phone', s_phone,
                    'seller_bank_details', s_bank
                ),
                'active',
                now(),
                now()
            )
            ON CONFLICT (user_id) DO UPDATE SET
                entity_type = EXCLUDED.entity_type,
                seller_details = EXCLUDED.seller_details,
                updated_at = now()
            RETURNING id INTO profile_pk;
            
            -- Link deal
            UPDATE deals SET seller_id = current_user_id WHERE id = r.id;
        END IF;

        -- Migrate Documents
        IF profile_pk IS NOT NULL THEN
            doc_fields := seller_task.payload->'fields';
            FOR doc_key IN SELECT jsonb_object_keys(doc_fields) LOOP
                IF doc_key LIKE 'doc_%' THEN
                    doc_path := doc_fields->>doc_key;
                    doc_type := replace(doc_key, 'doc_', '');
                    
                    IF doc_path IS NOT NULL AND doc_path != '' THEN
                        IF NOT EXISTS (
                            SELECT 1 FROM profile_documents 
                            WHERE profile_id = profile_pk 
                            AND document_type = doc_type 
                            AND storage_path = doc_path
                        ) THEN
                            INSERT INTO profile_documents (
                                profile_id, 
                                document_type, 
                                storage_path, 
                                title, 
                                status, 
                                uploaded_at
                            )
                            VALUES (
                                profile_pk,
                                doc_type,
                                doc_path,
                                split_part(doc_path, '/', 4), 
                                'valid',
                                now()
                            );
                        END IF;
                    END IF;
                END IF;
            END LOOP;
        END IF;
        
    END LOOP;
END $$;
