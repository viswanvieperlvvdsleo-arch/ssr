# Requirements Release

## Client workflow

1. Sign in using the existing User category.
2. Open Your Requirements (Requirements on the mobile navigation).
3. Choose New requirement. The To inbox and Your email are filled automatically.
4. Enter a subject and body, with optional CC addresses and signature, then submit.
5. Keep the generated REQ token. View shows sourcing staff in joining order,
   work status, profile count, and who closed the requirement and when.

Users only receive their own requirements. SJ staff receive new-requirement
notifications and see requests in Tokens, the internal requirements feed, and
Task Board. Existing sourcing and closure actions update the user's tracking page.
The tracking page checks for updates every 10 seconds while visible and on focus.
It is polling, not a new WebSocket connection.

Company Administration and the separate company workspace show Coming in V2.
Existing company records are retained. Normal User, Trainer and SJ staff logins
remain available.

## Email activation (deployment owner)

Configure these server-only variables locally and on the deployed environment:

```dotenv
RESEND_API_KEY=<your-private-resend-api-key>
REQUIREMENTS_FROM_EMAIL=SJ Requirements <requirements@your-verified-domain.example>
REQUIREMENTS_TO_EMAIL=requirements-inbox@example.com
```

Verify the sender domain in Resend, replace the example addresses, and restart or
redeploy. Never use NEXT_PUBLIC_ for the API key or commit it to Git.
Existing company-specific requirement inboxes take precedence for legacy company
submissions. Normal User submissions go to REQUIREMENTS_TO_EMAIL.

Email uses the app's verified sender and sets Reply-To to the submitting user's
account email. The token appears in the subject and body. Optional CC is limited
to five validated addresses. It does not send as the user's personal Gmail account.

The requirement is saved even when email is unconfigured or fails. The token page
shows the email outcome. Retry email reuses the same token and task. Messages
already sent cannot be resent here. An unconfirmed outcome (timeout, server error,
or interrupted status update) requires checking Resend before attempting recovery.
Sent means accepted by Resend, not confirmed delivery to an inbox.

Resend supports a per-token Idempotency-Key for 24 hours:
https://resend.com/docs/dashboard/emails/idempotency-keys
Sending API: https://resend.com/docs/api-reference/emails/send-email

## Acceptance checks

- Submit from User A; verify its token appears in SJ Tokens and Task Board.
- Sign in as User B; A's requirement must not appear, including direct API access.
- Claim as SJ employee, add a profile, complete work, then close as authorized staff.
  Check A's worker list, counts, completion timestamps, and notification links.
- Verify a configured test email in the real inbox, including CC and Reply-To.
- With mail configuration missing, the token must still exist and show setup pending.
- Retry that saved token after setup: no second requirement or task should appear.
- Check desktop and mobile navigation, search, form, and details.

Local automated tests mock email and database boundaries. They do not prove live
mail delivery, production credentials, push permissions, or a real two-device flow.
