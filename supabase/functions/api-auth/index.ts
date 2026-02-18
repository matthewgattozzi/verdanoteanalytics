import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function validateApiKey(key: string) {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const keyHash = await hashKey(key);

  const { data: apiKey, error } = await supabase
    .from("api_keys")
    .select("*")
    .eq("key_hash", keyHash)
    .eq("is_active", true)
    .single();

  if (error || !apiKey) {
    return { valid: false, error: "Invalid API key" };
  }

  if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
    return { valid: false, error: "API key expired" };
  }

  // Fire-and-forget last_used_at update
  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiKey.id)
    .then(() => {});

  return {
    valid: true as const,
    userId: apiKey.user_id,
    permissions: apiKey.permissions as string[],
  };
}

export function extractApiKey(req: Request): string | null {
  // Support both Authorization: Bearer <key> and x-api-key: <key>
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.replace("Bearer ", "");
  }
  return req.headers.get("x-api-key");
}

export function unauthorizedResponse(message: string, corsHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
