This is the family Pokémon card collection tracker.

## Enable the binder scanner

Create a file named `.env.local` inside the `app` folder and add:

```text
OPENAI_API_KEY=your_private_key_here
```

Never commit or share this key. Restart `npm run dev` after adding it. The scanner uses image input to identify cards, then asks you to confirm matches before saving them.

## Publish with Vercel + Supabase

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL Editor.
3. Create a family user in Supabase Authentication.
4. Copy `.env.example` to `.env.local` and fill in the Supabase project URL, publishable key, service-role key, allowed family email, and OpenAI key.
5. Run `npm run import:collections` once to copy the existing local collection into Supabase.
6. In Vercel, import the GitHub repository and set the Root Directory to `app`.
7. Add the same environment variables in Vercel, then deploy.

Visitors can browse cards without signing in. Only approved family accounts can add, scan, or remove cards.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
