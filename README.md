This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Google OAuth Setup (Gmail + Drive)

Connecting Gmail or Google Drive from the Feeds page requires these environment variables:

```bash
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/gmail/auth/callback"
```

Add them to `.env.local`, then restart the dev server.

In Google Cloud Console (OAuth client):

1. Open your OAuth 2.0 Client ID.
2. Add this Authorized redirect URI:
	- `http://localhost:3000/api/gmail/auth/callback`

Notes:

- Gmail and Drive use the same Google OAuth flow in this project.
- If these variables are missing, `/api/gmail/auth/start` and `/api/drive/auth/start` return `503` with `code: "GOOGLE_OAUTH_NOT_CONFIGURED"`.
