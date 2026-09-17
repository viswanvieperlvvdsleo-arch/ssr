import test from 'node:test';
import assert from 'node:assert/strict';
import { requirementScope, canSubmitRequirement } from '../app/api/ssr/requirements/policy.mjs';
import { sendRequirementEmail, requirementMailConfig } from '../app/api/ssr/requirements/email.mjs';

test('individual users only read their own submissions, staff read the register', () => {
  assert.deepEqual(requirementScope({ id: 'a', role: 'Participant' }), { senderId: 'a' });
  assert.deepEqual(requirementScope({ id: 'b', role: 'Participant' }), { senderId: 'b' });
  for (const role of ['Employee', 'Admin', 'Super Admin']) assert.deepEqual(requirementScope({ id: 's', role }), {});
  assert.equal(requirementScope({ id: 't', role: 'Trainer' }), null);
  assert.equal(requirementScope(null), null);
  assert.equal(requirementScope({ id: 's', role: 'Super Admin', restricted: true }), null);
});

test('company scope takes priority over admin role and posting requires permission', () => {
  assert.deepEqual(requirementScope({ id: 'admin', role: 'Admin', companyId: 'A' }), { companyId: 'A' });
  assert.equal(canSubmitRequirement({ role: 'Participant' }), true);
  assert.equal(canSubmitRequirement({ role: 'Participant', restricted: true }), false);
  assert.equal(canSubmitRequirement({ role: 'Trainer' }), false);
  assert.equal(canSubmitRequirement({ role: 'Employee', companyId: 'A' }), false);
  assert.equal(canSubmitRequirement({ role: 'Employee', companyId: 'A', permissions: ['post_feeds'] }), true);
});

const input = {
  submission: { token: 'REQ-TEST', fromEmail: 'client@example.com', cc: ['copy@example.com'], signature: 'Client signature' },
  task: { title: 'SAP consultant', description: 'Requirement body', createdByName: 'Client' }, company: null,
};
const env = { RESEND_API_KEY: 'test-key', REQUIREMENTS_FROM_EMAIL: 'SJ <sj@example.com>', REQUIREMENTS_TO_EMAIL: 'inbox@example.com' };

test('missing configuration saves an explicit outcome without contacting a provider', async () => {
  const result = await sendRequirementEmail(input, { env: {}, fetcher: () => { throw new Error('Must not call'); } });
  assert.equal(result.emailStatus, 'not_configured');
  assert.equal(requirementMailConfig(null, {}).ready, false);
  assert.equal(requirementMailConfig({ requirementEmail: 'company@example.com' }, env).to, 'company@example.com');
});

test('email carries token, verified sender, reply-to, CC and signature', async () => {
  const result = await sendRequirementEmail(input, { env, fetcher: async (url, options) => {
    assert.equal(url, 'https://api.resend.com/emails');
    assert.equal(options.headers['Idempotency-Key'], 'requirement/REQ-TEST');
    assert.ok(options.signal);
    const payload = JSON.parse(options.body);
    assert.equal(payload.from, env.REQUIREMENTS_FROM_EMAIL);
    assert.equal(payload.reply_to, input.submission.fromEmail);
    assert.deepEqual(payload.to, [env.REQUIREMENTS_TO_EMAIL]);
    assert.deepEqual(payload.cc, input.submission.cc);
    assert.equal(payload.subject, '[REQ-TEST] SAP consultant');
    assert.match(payload.text, /Requirement body[\s\S]*Client signature/);
    return Response.json({ id: 'email-id' });
  } });
  assert.deepEqual(result, { emailStatus: 'sent', emailError: null });
});

test('rejection is retryable; server failure and network ambiguity are not reported as sent', async () => {
  assert.equal((await sendRequirementEmail(input, { env, fetcher: async () => new Response('', { status: 422 }) })).emailStatus, 'failed');
  assert.equal((await sendRequirementEmail(input, { env, fetcher: async () => new Response('', { status: 503 }) })).emailStatus, 'unknown');
  assert.equal((await sendRequirementEmail(input, { env, fetcher: async () => { throw new Error('timeout secret'); } })).emailStatus, 'unknown');
  const invalid = await sendRequirementEmail(input, { env, fetcher: async () => Response.json({}) });
  assert.equal(invalid.emailStatus, 'unknown');
  assert.doesNotMatch(invalid.emailError, /test-key|secret/);
});
