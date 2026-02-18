
CREATE TABLE api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  permissions TEXT[] DEFAULT '{read}',
  last_used_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own API keys"
  ON api_keys FOR ALL USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION create_api_key(key_name TEXT, api_key TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  key_id UUID;
  key_hash TEXT;
  key_prefix TEXT;
BEGIN
  key_hash := encode(digest(api_key, 'sha256'), 'hex');
  key_prefix := substring(api_key from 1 for 8);
  INSERT INTO api_keys (user_id, name, key_hash, key_prefix)
  VALUES (auth.uid(), key_name, key_hash, key_prefix)
  RETURNING id INTO key_id;
  RETURN key_id;
END;
$$;
