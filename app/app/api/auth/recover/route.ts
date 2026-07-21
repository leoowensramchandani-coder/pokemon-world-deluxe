const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export async function POST(request: Request) {
  const { email } = await request.json() as { email?: string };
  if (!email) return Response.json({ error: "Enter your email address." }, { status: 400 });
  const redirect = "https://pokemon-world-deluxe.vercel.app/";
  const response = await fetch(`${url}/auth/v1/recover?redirect_to=${encodeURIComponent(redirect)}`, { method: "POST", headers: { apikey: key ?? "", "Content-Type": "application/json" }, body: JSON.stringify({ email: email.toLowerCase() }), cache: "no-store" });
  if (!response.ok) return Response.json({ error: "Could not send the reset email. Please try again." }, { status: response.status });
  return Response.json({ message: "Password reset email sent! Open the link in that email." });
}
