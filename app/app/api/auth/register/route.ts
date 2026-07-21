const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export async function POST(request: Request) {
  const { email, password } = await request.json() as { email?: string; password?: string };
  if (!email || !password || password.length < 8) return Response.json({ error: "Use a valid email and a password with at least 8 characters." }, { status: 400 });
  const redirect = "https://pokemon-world-deluxe.vercel.app/";
  const response = await fetch(`${url}/auth/v1/signup?redirect_to=${encodeURIComponent(redirect)}`, { method: "POST", headers: { apikey: key ?? "", "Content-Type": "application/json" }, body: JSON.stringify({ email: email.toLowerCase(), password }), cache: "no-store" });
  const body = await response.json();
  if (!response.ok) return Response.json({ error: body.msg ?? body.message ?? "Could not create that account." }, { status: response.status });
  return Response.json({ message: body.access_token ? "Account created!" : "Account created! Check your email, then open the confirmation link.", accessToken: body.access_token });
}
