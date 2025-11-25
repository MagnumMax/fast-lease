-- Cancel creation of mismatching doc tasks based on buyer_type/seller_type

CREATE OR REPLACE FUNCTION public.filter_doc_tasks_by_type()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  deal_buyer_type text;
  deal_seller_type text;
  effective_buyer text;
  effective_seller text;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RETURN NEW;
  END IF;

  IF NEW.type IN ('COLLECT_BUYER_DOCS_COMPANY','COLLECT_BUYER_DOCS_INDIVIDUAL','COLLECT_BUYER_DOCS','COLLECT_DOCS') THEN
    SELECT payload->>'buyer_type' INTO deal_buyer_type FROM deals WHERE id = NEW.deal_id;
    effective_buyer := COALESCE(NEW.payload->'fields'->>'buyer_type', NEW.payload->'defaults'->>'buyer_type', deal_buyer_type);
    IF effective_buyer IS NULL THEN
      RETURN NEW;
    END IF;
    IF effective_buyer = 'company' AND NEW.type IN ('COLLECT_BUYER_DOCS_INDIVIDUAL') THEN
      RETURN NULL;
    END IF;
    IF effective_buyer = 'individual' AND NEW.type IN ('COLLECT_BUYER_DOCS_COMPANY') THEN
      RETURN NULL;
    END IF;
  ELSIF NEW.type IN ('COLLECT_SELLER_DOCS_COMPANY','COLLECT_SELLER_DOCS_INDIVIDUAL','COLLECT_SELLER_DOCS') THEN
    SELECT payload->>'seller_type' INTO deal_seller_type FROM deals WHERE id = NEW.deal_id;
    effective_seller := COALESCE(NEW.payload->'fields'->>'seller_type', NEW.payload->'defaults'->>'seller_type', deal_seller_type);
    IF effective_seller IS NULL THEN
      RETURN NEW;
    END IF;
    IF effective_seller = 'company' AND NEW.type IN ('COLLECT_SELLER_DOCS_INDIVIDUAL') THEN
      RETURN NULL;
    END IF;
    IF effective_seller = 'individual' AND NEW.type IN ('COLLECT_SELLER_DOCS_COMPANY') THEN
      RETURN NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_filter_doc_tasks_by_type ON tasks;
CREATE TRIGGER trg_filter_doc_tasks_by_type
BEFORE INSERT ON tasks
FOR EACH ROW
EXECUTE FUNCTION public.filter_doc_tasks_by_type();
