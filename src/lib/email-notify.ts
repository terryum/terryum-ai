/**
 * Resend transactional email helper.
 *
 * Used for low-volume admin notifications (e.g. new comment alerts).
 * Skips silently if RESEND_API_KEY is not configured so dev/CI can run
 * without real credentials. Never throws — caller must not depend on
 * delivery for correctness.
 */
const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const SEND_TIMEOUT_MS = 2000;

interface SendOpts {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

function fromAddress(): string {
  // Resend requires a verified domain; default to a no-reply at terryum.ai.
  return process.env.RESEND_FROM_EMAIL || 'no-reply@terryum.ai';
}

export async function sendEmail(opts: SendOpts): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY not configured' };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), SEND_TIMEOUT_MS);

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [opts.to],
        subject: opts.subject,
        text: opts.text,
        ...(opts.html ? { html: opts.html } : {}),
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return { ok: false, error: `HTTP ${res.status}: ${detail.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timer);
  }
}

/* ─── Comment notification ─── */

interface CommentNotificationInput {
  slug: string;
  postTitle?: string;
  authorName: string;
  authorEmail: string;
  content: string;
  status: 'visible' | 'hidden' | 'spam';
  ipHash?: string;
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://www.terryum.ai';
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function notifyNewComment(input: CommentNotificationInput): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;

  const postLabel = input.postTitle ? `${input.postTitle} (${input.slug})` : input.slug;
  const flag = input.status === 'spam' ? '[SPAM] ' : input.status === 'hidden' ? '[HIDDEN] ' : '';
  const subject = `${flag}[terryum.ai] 새 댓글: ${postLabel} — ${input.authorName}`;

  const postUrl = `${siteUrl()}/posts/${input.slug}`;
  const adminUrl = `${siteUrl()}/admin/comments`;

  const text = [
    `새 댓글이 등록되었습니다.`,
    ``,
    `Post:    ${postLabel}`,
    `URL:     ${postUrl}`,
    `Status:  ${input.status}`,
    `Author:  ${input.authorName} <${input.authorEmail}>`,
    input.ipHash ? `IP hash: ${input.ipHash}` : null,
    ``,
    `--- 본문 ---`,
    input.content,
    `------------`,
    ``,
    `모더레이션: ${adminUrl}`,
  ].filter(Boolean).join('\n');

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;max-width:600px">
      <h2 style="margin:0 0 12px">새 댓글이 등록되었습니다</h2>
      <table style="font-size:14px;border-collapse:collapse">
        <tr><td style="padding:4px 8px;color:#666">Post</td><td style="padding:4px 8px"><a href="${escapeHtml(postUrl)}">${escapeHtml(postLabel)}</a></td></tr>
        <tr><td style="padding:4px 8px;color:#666">Status</td><td style="padding:4px 8px">${escapeHtml(input.status)}</td></tr>
        <tr><td style="padding:4px 8px;color:#666">Author</td><td style="padding:4px 8px">${escapeHtml(input.authorName)} &lt;${escapeHtml(input.authorEmail)}&gt;</td></tr>
        ${input.ipHash ? `<tr><td style="padding:4px 8px;color:#666">IP hash</td><td style="padding:4px 8px;font-family:monospace">${escapeHtml(input.ipHash)}</td></tr>` : ''}
      </table>
      <pre style="background:#f6f6f6;padding:12px;border-radius:6px;white-space:pre-wrap;word-break:break-word;font-family:inherit;font-size:14px;margin-top:12px">${escapeHtml(input.content)}</pre>
      <p style="font-size:13px;color:#666">
        <a href="${escapeHtml(adminUrl)}">모더레이션 페이지에서 검토</a>
      </p>
    </div>
  `.trim();

  const result = await sendEmail({
    to: adminEmail,
    subject,
    text,
    html,
    replyTo: input.authorEmail,
  });

  if (!result.ok) {
    console.warn('[notifyNewComment] email send failed:', result.error);
  }
}
