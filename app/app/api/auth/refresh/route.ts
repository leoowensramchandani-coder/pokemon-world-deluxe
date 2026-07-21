const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export async function POST(request: Request) {
  const { refreshToken } = await request.json() as { refreshToken?: string };
  if (!refreshToken) return Response.json({ error: "No saved session." }, { status: 401 });
  const response = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, { method: "POST", headers: { apikey: key ?? "", "Content-Type": "application/json" }, body: JSON.stringify({ refresh_token: refreshToken }), cache: "no-store" });
  if (!response.ok) return Response.json({ error: "Saved session expired." }, { status: 401 });
  const session = await response.json();
  return Response.json({ accessToken: session.access_token, refreshToken: session.refresh_token });
}
