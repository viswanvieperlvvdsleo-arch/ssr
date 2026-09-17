export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function requirementMailConfig(company, env = process.env, customTo = null) {
  const to = (customTo || company?.requirementEmail || env.REQUIREMENTS_TO_EMAIL || 'admin.ssrbs@gmail.com').trim();
  const from = (env.REQUIREMENTS_FROM_EMAIL || 'SJ Info <onboarding@resend.dev>').trim();
  return { to, from, ready: Boolean(env.RESEND_API_KEY && emailPattern.test(to)) };
}

export async function sendRequirementEmail({ submission, task, company, toEmail }, { env = process.env, fetcher = fetch } = {}) {
  const { to, from, ready } = requirementMailConfig(company, env, toEmail);
  if (!ready) return { emailStatus: 'not_configured', emailError: 'Resend API key is not configured in environment.' };
  try {
    const response = await fetcher('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(6000),
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json',
        'Idempotency-Key': `requirement/${submission.token}`,
      },
      body: JSON.stringify({
        from, to: [to],
        ...(submission.cc.length ? { cc: submission.cc } : {}), reply_to: submission.fromEmail,
        subject: `[${submission.token}] ${task.title}`,
        text: `Client: ${company?.name || task.createdByName}\nFrom: ${submission.fromEmail}\nToken: ${submission.token}\n\n${task.description || ''}${submission.signature ? `\n\n${submission.signature}` : ''}`,
      }),
    });
    if (!response.ok) return {
      emailStatus: response.status >= 500 || response.status === 409 ? 'unknown' : 'failed',
      emailError: `Email provider returned status ${response.status}. Check Resend API key and verified domain.`,
    };
    const result = await response.json().catch(() => ({}));
    if (!result?.id) throw new Error('Missing email ID');
    return { emailStatus: 'sent', emailError: null };
  } catch (err) {
    return { emailStatus: 'unknown', emailError: err.message || 'Email delivery could not be confirmed.' };
  }
}

