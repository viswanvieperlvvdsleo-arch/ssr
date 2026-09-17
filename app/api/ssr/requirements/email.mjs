export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function requirementMailConfig(company, env = process.env) {
  const to = (company?.requirementEmail || env.REQUIREMENTS_TO_EMAIL || '').trim();
  return { to, ready: Boolean(env.RESEND_API_KEY && env.REQUIREMENTS_FROM_EMAIL && emailPattern.test(to)) };
}

export async function sendRequirementEmail({ submission, task, company }, { env = process.env, fetcher = fetch } = {}) {
  const { to, ready } = requirementMailConfig(company, env);
  if (!ready) return { emailStatus: 'not_configured', emailError: 'SJ must configure the requirement email sender and inbox.' };
  try {
    const response = await fetcher('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(10000),
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json',
        'Idempotency-Key': `requirement/${submission.token}`,
      },
      body: JSON.stringify({
        from: env.REQUIREMENTS_FROM_EMAIL, to: [to],
        ...(submission.cc.length ? { cc: submission.cc } : {}), reply_to: submission.fromEmail,
        subject: `[${submission.token}] ${task.title}`,
        text: `Client: ${company?.name || task.createdByName}\nFrom: ${submission.fromEmail}\nToken: ${submission.token}\n\n${task.description || ''}${submission.signature ? `\n\n${submission.signature}` : ''}`,
      }),
    });
    if (!response.ok) return {
      emailStatus: response.status >= 500 || response.status === 409 ? 'unknown' : 'failed',
      emailError: `Email provider returned ${response.status}. SJ should check the email service.`,
    };
    const result = await response.json();
    if (!result.id) throw new Error('Missing email ID');
    return { emailStatus: 'sent', emailError: null };
  } catch {
    // A timeout can happen after acceptance. Do not automatically send a duplicate.
    return { emailStatus: 'unknown', emailError: 'Email confirmation unavailable. SJ should check the provider before resending.' };
  }
}
