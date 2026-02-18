
-- Fix: include extensions schema in search_path so digest() is found
CREATE OR REPLACE FUNCTION create_api_key(key_name TEXT, api_key TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  key_id UUID;
  key_hash TEXT;
  key_prefix TEXT;
BEGIN
  key_hash := encode(extensions.digest(api_key, 'sha256'), 'hex');
  key_prefix := substring(api_key from 1 for 8);
  INSERT INTO api_keys (user_id, name, key_hash, key_prefix)
  VALUES (auth.uid(), key_name, key_hash, key_prefix)
  RETURNING id INTO key_id;
  RETURN key_id;
END;
$$;
