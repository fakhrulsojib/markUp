# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in MarkUp, please report it responsibly:

1. **DO NOT** open a public GitHub issue.
2. Email **fakhrulsojib@gmail.com** with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
3. You will receive a response within 48 hours.
4. A fix will be developed privately and released as a patch.

## Scope

Security issues in the following areas are in scope:
- XSS via Markdown rendering (sanitizer bypass)
- CSP violations
- Permission escalation
- Data exfiltration

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.3.x   | ✅ Yes    |
| < 0.3   | ❌ No     |
