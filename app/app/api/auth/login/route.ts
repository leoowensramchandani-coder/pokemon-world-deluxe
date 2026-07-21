import { signIn } from "@/lib/cloud";

export async function POST(request: Request) {
  const { email, password } = await request.json() as { email?: string; password?: string };
  if (!email || !password) return Response.json({ error: "Enter the family email and password." }, { status: 400 });
  const session = await signIn(email, password);
  if (!session) return Response.json({ error: "That login did not work." }, { status: 401 });
  return Response.json({ accessToken: session.access_token, refreshToken: session.refresh_token, email: session.user.email });
}
