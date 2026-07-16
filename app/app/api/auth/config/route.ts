import { cloudConfigured } from "@/lib/cloud";

export async function GET() {
  return Response.json({ cloudMode: cloudConfigured });
}
