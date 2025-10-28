# Security Policy

## Supported Versions

We actively support and provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of LiLove seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

**Please DO NOT create a public GitHub issue for security vulnerabilities.**

Instead, please report security vulnerabilities by emailing: **security@lilove.org**

Include the following information:
- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Suggested fix (if any)

### What to Expect

1. **Acknowledgment**: We'll acknowledge receipt of your report within 48 hours
2. **Investigation**: We'll investigate and validate the vulnerability within 7 days
3. **Resolution**: We'll work on a fix and keep you informed of progress
4. **Disclosure**: We'll coordinate disclosure timing with you
5. **Credit**: We'll credit you in our security advisories (unless you prefer to remain anonymous)

### Response Timeline

- **Critical vulnerabilities**: Patched within 24-48 hours
- **High severity**: Patched within 7 days
- **Medium severity**: Patched within 30 days
- **Low severity**: Addressed in next regular release

## Security Measures

### Authentication & Authorization

- **Password Security**: Passwords are hashed using bcrypt with 10 rounds
- **Session Management**: Secure session cookies with httpOnly, secure, and sameSite=strict flags
- **OAuth Integration**: PKCE flow for OAuth 2.0, state validation to prevent CSRF
- **Account Linking**: Secure email-based account merging with user confirmation
- **Rate Limiting**: Brute force protection on auth endpoints (5 attempts per 15 minutes)

### Data Protection

- **Encryption in Transit**: HTTPS enforced with TLS 1.2+ (Let's Encrypt certificates)
- **Encryption at Rest**: Database encrypted at rest (Neon PostgreSQL)
- **PII Protection**: No sensitive data logged; email addresses hashed in logs
- **Data Minimization**: We only collect data necessary for service functionality
- **Right to Deletion**: Users can delete their accounts and all associated data

### Payment Security

- **PCI Compliance**: We don't store or transmit credit card data
- **Payment Processors**: All payments through PCI-DSS compliant providers (Paddle, Apple)
- **Webhook Verification**: All payment webhooks verified with HMAC signatures
- **Idempotency**: Payment operations are idempotent to prevent duplicate charges

### Infrastructure Security

- **Dependency Scanning**: Automated dependency audits with Dependabot
- **Code Scanning**: CodeQL security analysis in CI/CD
- **Input Validation**: All user inputs validated with Zod schemas
- **SQL Injection Protection**: Parameterized queries via Drizzle ORM
- **XSS Protection**: React auto-escaping + Content Security Policy headers
- **CSRF Protection**: csurf middleware + SameSite cookies
- **SSRF Protection**: No user-controlled URLs or server-side requests

### Security Headers

We implement the following HTTP security headers:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

## Known Security Limitations

### Planned Security Enhancements

- [ ] WebAuthn/FIDO2 authentication (Passkeys) - In development
- [ ] Multi-factor authentication (MFA) - Planned for v1.1
- [ ] Security.txt file - Coming soon
- [ ] Bug bounty program - When we reach 10,000 users

### Current Limitations

- **No MFA yet**: Two-factor authentication not yet implemented (planned for v1.1)
- **Email verification optional**: Email verification is recommended but not enforced
- **Session fixation**: Sessions are not rotated on privilege escalation (planned fix)

## Security Best Practices for Users

### For End Users

1. **Use Strong Passwords**: Minimum 8 characters with mixed case, numbers, and symbols
2. **Enable OAuth**: Use Sign in with Google/Apple for enhanced security
3. **Secure Your Email**: Your email is your account recovery method
4. **Log Out on Shared Devices**: Always log out when using public computers
5. **Report Suspicious Activity**: Contact us immediately if you notice unusual account activity

### For Developers

1. **Never Commit Secrets**: Use environment variables, never commit credentials to Git
2. **Use HTTPS Locally**: Test OAuth flows with HTTPS (use ngrok or localhost certificates)
3. **Validate All Inputs**: Never trust user input; always validate and sanitize
4. **Keep Dependencies Updated**: Run `npm audit` regularly and update dependencies
5. **Follow Principle of Least Privilege**: Grant minimum necessary permissions
6. **Review Code for Security**: Consider security implications of all code changes

## Compliance

### GDPR (General Data Protection Regulation)

- **Data Subject Rights**: We support all GDPR rights (access, rectification, erasure, portability)
- **Data Processing Agreement**: Available upon request
- **Privacy by Design**: Security and privacy built into every feature
- **Data Breach Notification**: We'll notify affected users within 72 hours of discovery

### CCPA (California Consumer Privacy Act)

- **Right to Know**: Users can request what data we collect
- **Right to Delete**: Users can request deletion of their data
- **Right to Opt-Out**: Users can opt out of data "sales" (we don't sell data)
- **Non-Discrimination**: We don't discriminate against users who exercise their rights

### SOC 2 (Future)

We plan to pursue SOC 2 Type II certification when we reach enterprise scale.

## Security Audit History

| Date       | Type                | Auditor        | Status |
|------------|---------------------|----------------|--------|
| 2025-10-28 | Internal Code Review| LiLove Team    | Pass   |
| TBD        | External Penetration Test | TBD      | Planned|

## Security Updates

Subscribe to security advisories: [GitHub Security Advisories](https://github.com/berkemd/lilove/security/advisories)

## Contact

- **Security Issues**: security@lilove.org
- **Privacy Questions**: privacy@lilove.org
- **General Support**: support@lilove.org

## Acknowledgments

We'd like to thank the following security researchers for responsibly disclosing vulnerabilities:

_No vulnerabilities reported yet._

---

**Last Updated**: October 28, 2025  
**Version**: 1.0.0  
**Contact**: security@lilove.org
