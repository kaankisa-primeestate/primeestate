# PrimeEstate Authentication Setup

## Login

PrimeEstate uses Better Auth with email/password authentication.

Required runtime variables:

- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`

## Password reset

The login screen now includes **Şifremi unuttum**.

Password reset uses Better Auth's reset-token flow and sends the reset link through Resend.

Required Render environment variables:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

Example:

```text
RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM_EMAIL=PrimeEstate <no-reply@your-verified-domain.com>
```

The sender domain must be verified in Resend.

### Flow

1. User selects **Şifremi unuttum**.
2. User enters the account email.
3. PrimeEstate requests a Better Auth password-reset token.
4. Resend sends the reset link.
5. User opens `/reset-password?token=...`.
6. PrimeEstate sets the new password.
7. Existing sessions are revoked after a successful reset.

Reset tokens expire after 1 hour.

## Security

The forgot-password screen intentionally uses a generic success message so the application does not reveal whether a specific email address exists.

Password reset does not display or expose the user's current password. Passwords are stored as hashes by the authentication layer.
