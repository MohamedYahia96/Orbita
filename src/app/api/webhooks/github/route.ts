import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

type GitHubPushCommit = {
    message?: string;
    url?: string;
    timestamp?: string;
    author?: {
        name?: string;
    };
};

type GitHubPayload = {
    repository?: {
        html_url?: string;
        full_name?: string;
    };
    commits?: GitHubPushCommit[];
    release?: {
        name?: string;
        html_url?: string;
        body?: string;
        published_at?: string;
    };
};

type WebhookItemData = {
    title: string;
    url: string;
    content: string;
    publishedAt: Date;
};

function isValidGitHubSignature(rawBody: string, signature: string, secret: string) {
    const expected = `sha256=${crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex')}`;

    const expectedBuffer = Buffer.from(expected);
    const signatureBuffer = Buffer.from(signature);
    if (expectedBuffer.length !== signatureBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

export async function POST(req: Request) {
  try {
        const rawBody = await req.text();
        const signature = req.headers.get('x-hub-signature-256');
        const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

        if (process.env.NODE_ENV === 'production') {
            if (!webhookSecret) {
                return NextResponse.json(
                    { success: false, error: 'Webhook misconfigured: GITHUB_WEBHOOK_SECRET is missing' },
                    { status: 500 }
                );
            }

            if (!signature || !isValidGitHubSignature(rawBody, signature, webhookSecret)) {
                return NextResponse.json({ success: false, error: 'Invalid webhook signature' }, { status: 401 });
            }
        } else if (webhookSecret && signature && !isValidGitHubSignature(rawBody, signature, webhookSecret)) {
            return NextResponse.json({ success: false, error: 'Invalid webhook signature' }, { status: 401 });
        }

        let payload: GitHubPayload;
        try {
            payload = JSON.parse(rawBody) as GitHubPayload;
        } catch {
            return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
        }

    const event = req.headers.get('x-github-event');

    if (event === 'push' || event === 'release' || event === 'issues') {
            const rawRepoUrl = payload.repository?.html_url;
            const repoUrl = typeof rawRepoUrl === 'string' ? rawRepoUrl.replace(/\/$/, '') : null;
            if (!repoUrl) {
                return NextResponse.json({ success: true });
            }

        const feed = await prisma.feed.findFirst({
                where: {
                    type: 'github',
                    status: { in: ['active', 'error'] },
                    OR: [
                        { url: repoUrl },
                        { url: `${repoUrl}/` },
                        { rssUrl: `${repoUrl}/releases.atom` }
                    ]
        }
            });

            if (feed) {
                let itemData: WebhookItemData | null = null;

                if (event === 'push') {
                    const commit = payload.commits?.[0];
                    if (commit) {
                        const message = commit.message || 'New commit';
                        itemData = {
                            title: `Push: ${message.substring(0, 50)}...`,
                            url: commit.url || repoUrl,
                            content: `User ${commit.author?.name || 'Unknown'} pushed to ${payload.repository?.full_name || repoUrl}`,
                            publishedAt: commit.timestamp ? new Date(commit.timestamp) : new Date()
                        };
                    }
                } else if (event === 'release') {
                    itemData = {
                        title: `Release: ${payload.release?.name || 'New release'}`,
                        url: payload.release?.html_url || repoUrl,
                        content: payload.release?.body || '',
                        publishedAt: payload.release?.published_at ? new Date(payload.release.published_at) : new Date()
                    };
                }

                if (itemData) {
                    const existing = await prisma.feedItem.findFirst({
                        where: { feedId: feed.id, url: itemData.url }
                    });

                    if (!existing) {
                        await prisma.feedItem.create({
                            data: {
                                feedId: feed.id,
                                title: itemData.title,
                                url: itemData.url,
                                content: itemData.content,
                                mediaType: 'article',
                                publishedAt: itemData.publishedAt,
                                extraData: JSON.stringify({ event })
                            }
                        });
                    }
                }
            }
    }

    return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'GitHub webhook failed';
    console.error('[GitHub Webhook Error]', error);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
