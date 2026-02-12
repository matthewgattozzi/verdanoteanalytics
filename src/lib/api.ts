import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export async function apiFetch(
  functionName: string,
  path: string = "",
  options: RequestInit = {}
): Promise<any> {
  const url = `${SUPABASE_URL}/functions/v1/${functionName}${path ? `/${path}` : ""}`;

  // Get current session token
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const resp = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!resp.ok) {
    const error = await resp.json().catch(() => ({ error: resp.statusText }));
    throw new Error(error.error || `API error: ${resp.status}`);
  }

  return resp.json();
}
