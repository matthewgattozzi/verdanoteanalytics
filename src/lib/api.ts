const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export async function apiFetch(
  functionName: string,
  path: string = "",
  options: RequestInit = {}
): Promise<any> {
  const url = `${SUPABASE_URL}/functions/v1/${functionName}${path ? `/${path}` : ""}`;

  const resp = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_KEY}`,
      ...(options.headers || {}),
    },
  });

  if (!resp.ok) {
    const error = await resp.json().catch(() => ({ error: resp.statusText }));
    throw new Error(error.error || `API error: ${resp.status}`);
  }

  return resp.json();
}
