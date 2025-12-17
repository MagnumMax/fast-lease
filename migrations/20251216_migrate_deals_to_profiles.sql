DO $$
DECLARE
    r RECORD;
    p_entity_type TEXT;
BEGIN
    -- Iterate over deals that have a payload
    FOR r IN SELECT * FROM deals WHERE payload IS NOT NULL LOOP
        
        -- 1. Process Buyer (client_id)
        IF r.client_id IS NOT NULL THEN
            -- Determine entity type from payload, default to 'personal' if missing
            p_entity_type := CASE 
                WHEN (r.payload->>'buyer_type') = 'company' THEN 'company' 
                ELSE 'personal' 
            END;
            
            -- Update profile: set entity_type, and fill basic info if missing
            UPDATE profiles 
            SET 
                entity_type = p_entity_type,
                full_name = COALESCE(full_name, r.payload->'customer'->>'full_name'),
                phone = COALESCE(phone, r.payload->'customer'->>'phone')
            WHERE user_id = r.client_id;

            -- Ensure CLIENT role exists
            IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = r.client_id AND role = 'CLIENT') THEN
                INSERT INTO user_roles (user_id, role) VALUES (r.client_id, 'CLIENT');
            END IF;
        END IF;

        -- 2. Process Seller (seller_id)
        IF r.seller_id IS NOT NULL THEN
            -- Determine entity type
            p_entity_type := CASE 
                WHEN (r.payload->>'seller_type') = 'company' THEN 'company' 
                ELSE 'personal' 
            END;
            
            -- Update profile
            UPDATE profiles 
            SET entity_type = p_entity_type
            WHERE user_id = r.seller_id;
            
             -- Ensure SELLER role exists
            IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = r.seller_id AND role = 'SELLER') THEN
                INSERT INTO user_roles (user_id, role) VALUES (r.seller_id, 'SELLER');
            END IF;
        END IF;
        
        -- 3. Process Broker (broker_id)
        IF r.broker_id IS NOT NULL THEN
             -- Ensure BROKER role exists
            IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = r.broker_id AND role = 'BROKER') THEN
                INSERT INTO user_roles (user_id, role) VALUES (r.broker_id, 'BROKER');
            END IF;
        END IF;

    END LOOP;
END $$;
