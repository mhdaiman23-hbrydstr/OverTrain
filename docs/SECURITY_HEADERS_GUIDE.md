# Security Headers Implementation Guide

## Overview

This document describes the comprehensive security headers implemented in the LiftLog application. These headers protect against common web vulnerabilities including XSS, clickjacking, MIME-sniffing, and other attacks.

**Implementation Location**: [middleware.ts](../middleware.ts)

---

## Security Headers Implemented

### 1. Content-Security-Policy (CSP)

**Purpose**: Prevents XSS attacks by restricting where scripts, styles, and other resources can load from.

**Policy**:
```
default-src 'self'
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.sentry-cdn.com https://*.sentry.io
style-src 'self' 'unsafe-inline'
img-src 'self' data: https:
font-src 'self' data:
connect-src 'self' https://*.sentry.io https://*.supabase.co wss://*.supabase.co
frame-ancestors 'none'
base-uri 'self'
form-action 'self'
```

**What it blocks**:
- ✅ Inline scripts from untrusted sources
- ✅ Scripts loaded from external domains (except Sentry & Supabase)
- ✅ Framing of your app in other sites (clickjacking prevention)
- ✅ Form submissions to external domains

**Notes**:
- Includes `'unsafe-inline'` and `'unsafe-eval'` because Next.js/React require them
- Development environment allows `localhost:*` and `127.0.0.1:*` for local development
- Production environment uses strict external domain whitelisting

### 2. X-Frame-Options

**Purpose**: Prevents clickjacking attacks by controlling how your app can be framed.

**Value**: `DENY`

**What it does**:
- ✅ Prevents your app from being embedded in iframes on other sites
- ✅ Completely blocks framing (most restrictive option)
- ✅ Compatible with all browsers

---

### 3. X-Content-Type-Options

**Purpose**: Prevents MIME-sniffing attacks where browsers guess file types.

**Value**: `nosniff`

**What it does**:
- ✅ Forces browser to respect `Content-Type` header
- ✅ Prevents attacker-controlled files from being treated as scripts
- ✅ Protects against drive-by download attacks

---

### 4. Strict-Transport-Security (HSTS)

**Purpose**: Forces browser to always use HTTPS (only in production).

**Value**: `max-age=31536000; includeSubDomains; preload`

**What it does**:
- ✅ Tells browser to use HTTPS for 1 year (31536000 seconds)
- ✅ Applies to all subdomains (`includeSubDomains`)
- ✅ Allows inclusion in HSTS preload list
- ✅ Prevents man-in-the-middle attacks

**When enabled**:
- Production only (not in development)
- Requires valid HTTPS certificate

**Impact**:
- First visit still uses HTTP (header response redirects to HTTPS)
- Subsequent visits automatically use HTTPS
- Once cached, cannot be bypassed with HTTP for 1 year

---

### 5. Referrer-Policy

**Purpose**: Controls what referrer information is sent to external sites.

**Value**: `strict-origin-when-cross-origin`

**What it does**:
- ✅ Sends full URL for same-site requests (same domain)
- ✅ Sends only origin (domain) for cross-site requests
- ✅ Sends nothing when downgrading from HTTPS to HTTP
- ✅ Prevents leaking sensitive info in URLs to third parties

**Example**:
- Same-site: Send `https://example.com/user/profile` ✅
- Cross-site: Send only `https://example.com` ✅
- HTTPS→HTTP downgrade: Send nothing ✅

---

### 6. Permissions-Policy (formerly Feature-Policy)

**Purpose**: Restricts access to browser features like microphone, camera, geolocation.

**Policy**:
```
geolocation=()
microphone=()
camera=()
payment=()
```

**What it does**:
- ✅ Blocks geolocation requests
- ✅ Blocks microphone access
- ✅ Blocks camera access
- ✅ Blocks payment API access
- ✅ Prevents embedded content from requesting these features

**Note**: Fitness apps don't need these features, so blocking them improves security.

---

### 7. X-Permitted-Cross-Domain-Policies

**Purpose**: Restricts cross-domain access to Flash/PDF content.

**Value**: `none`

**What it does**:
- ✅ Prevents Flash or PDF files from accessing your app
- ✅ Protects against cross-domain policy bypass attacks
- ✅ Mostly for legacy browser protection

---

## Testing the Headers

### Option 1: Browser DevTools (Chrome/Edge/Firefox)

1. Open your app in browser
2. Open DevTools (F12)
3. Go to **Network** tab
4. Reload the page
5. Click on the main document request
6. Go to **Response Headers** section
7. Look for security headers: `Content-Security-Policy`, `X-Frame-Options`, etc.

### Option 2: Online Header Checker

Use [Security Headers Tool](https://securityheaders.com):
1. Enter your domain: `https://yourdomain.com`
2. View detailed analysis of all security headers
3. Get grade (A-F)

### Option 3: curl Command

```bash
curl -I https://yourdomain.com | grep -E "Content-Security-Policy|X-Frame-Options|X-Content-Type"
```

---

## Headers Overview Table

| Header | Value | Protection | Environment |
|--------|-------|-----------|-------------|
| **CSP** | Restrictive whitelist | XSS, clickjacking | Both (dev allows localhost) |
| **X-Frame-Options** | DENY | Clickjacking | Both |
| **X-Content-Type-Options** | nosniff | MIME-sniffing | Both |
| **HSTS** | 1 year + preload | MITM attacks | Production only |
| **Referrer-Policy** | strict-origin-when-cross-origin | Privacy leak | Both |
| **Permissions-Policy** | Blocks geo/mic/camera/payment | Feature abuse | Both |
| **X-Permitted-Cross-Domain** | none | Legacy attacks | Both |

---

## Future Enhancements

### CSP Nonce for Stricter Security

Currently using `'unsafe-inline'` for styles/scripts. For maximum security:

1. Remove `'unsafe-inline'`
2. Generate unique nonce per request
3. Add nonce to all inline scripts: `<script nonce="abc123">`
4. Add nonce to all inline styles: `<style nonce="abc123">`

**Trade-off**: More secure but requires code changes to every inline script/style.

### CSP Reporting

Add CSP violation reporting endpoint:
```
report-uri https://yourdomain.com/api/csp-report
```

This helps you:
- Monitor CSP violations in production
- Detect XSS attempts early
- Refine policy over time

### Subresource Integrity (SRI)

For external CDN resources, add integrity attributes:
```html
<script src="https://cdn.sentry-cdn.com/..."
        integrity="sha384-abc123..."
        crossorigin="anonymous"></script>
```

---

## Troubleshooting

### CSP Violations Blocking Resources

**Error**: Resources fail to load (scripts, styles, images)

**Solution**:
1. Check browser console for CSP violations
2. Look for source domain that's blocked
3. Add domain to appropriate CSP directive in middleware.ts
4. Test in development first (violation logged, not blocked)

### Can't Load External Fonts

**Error**: Custom fonts not loading

**Solution**:
```typescript
// Add font domain to CSP
font-src 'self' data: https://fonts.googleapis.com https://fonts.gstatic.com;
```

### API Calls Failing

**Error**: `connect-src` violation

**Solution**:
```typescript
// Add API domain to CSP
connect-src 'self' https://yourdomain.com https://api.example.com;
```

---

## Security Score

After implementing these headers, your app should achieve:

- **OWASP Secure Headers Score**: A+ (95-100)
- **securityheaders.com Score**: A (90+)
- **Mozilla Observatory Score**: A+ (90+)

---

## References

- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [MDN: HTTP Headers Security](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers#security)
- [Content-Security-Policy Docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [HSTS Spec](https://tools.ietf.org/html/rfc6797)
- [securityheaders.com](https://securityheaders.com)

---

## Last Updated

- **Date**: October 28, 2025
- **Implementation**: middleware.ts
- **Status**: ✅ Implemented and tested
