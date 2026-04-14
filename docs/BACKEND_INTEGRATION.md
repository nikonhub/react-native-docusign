# DocuSign Captive Signing — Backend Integration Spec

Audience: Goosehead backend engineers. Purpose: specify the one endpoint the mobile app needs to power in-app DocuSign signing, and explain why it must live on the backend (not the device).

## TL;DR

Mobile needs a single backend endpoint that returns a one-time signing URL for an envelope. The backend owns DocuSign credentials; the mobile app never sees them.

**Endpoint (to build):** `POST /api/docusign/signing-url`
**Input:** `{ envelopeId, clientUserId, userName, email, returnUrl }`
**Output:** `{ signingUrl, envelopeId }`

## Architecture

```
┌──────────┐          ┌──────────────────┐          ┌──────────┐
│  Mobile  │          │ Goosehead        │          │ DocuSign │
│   App    │          │ Backend (API)    │          │ Servers  │
└────┬─────┘          └────────┬─────────┘          └────┬─────┘
     │                         │                         │
     │ 1. User taps "Sign"     │                         │
     │                         │                         │
     │ 2. POST /api/docusign/  │                         │
     │    signing-url          │                         │
     │    { envelopeId,        │                         │
     │      clientUserId }     │                         │
     ├────────────────────────▶│                         │
     │                         │ 3. JWT Bearer auth      │
     │                         │    (signs assertion     │
     │                         │    with RSA private key)│
     │                         ├────────────────────────▶│
     │                         │ 4. access token         │
     │                         │◀────────────────────────┤
     │                         │                         │
     │                         │ 5. POST /envelopes/{id} │
     │                         │      /views/recipient   │
     │                         ├────────────────────────▶│
     │                         │ 6. { url: "..." }       │
     │                         │◀────────────────────────┤
     │ 7. { signingUrl }       │                         │
     │◀────────────────────────┤                         │
     │                         │                         │
     │ 8. presentCaptive       │                         │
     │    SigningWithUrl(url)  │                         │
     │                         │                         │
     │ 9. DocuSign UI opens    │                         │
     │    loads the url        │                         │
     ├─────────────────────────────────────────────────▶│
     │                         │                         │
     │ User signs in-app       │                         │
     │                         │                         │
     │ 10. onSigningComplete   │                         │
     │     fires, backend      │                         │
     │     polls/webhooks get  │                         │
     │     final PDF           │                         │
```

## Responsibilities

### Goosehead Backend (new work)

- **Store secrets securely**: DocuSign RSA private key + Integration Key (client_id). Use a secrets manager (AWS Secrets Manager, Vault, etc.) — never in config files or env variables committed to git.
- **Mint a DocuSign access token via JWT Bearer Grant** ([docs](https://developers.docusign.com/platform/auth/jwt/jwt-get-token/)):
  1. Build a JWT assertion with claims: `iss` (integration key), `sub` (DocuSign user GUID to impersonate), `aud` (`account-d.docusign.com` for demo, `account.docusign.com` for prod), `iat`, `exp` (≤ 1h), `scope: "signature impersonation"`.
  2. Sign with RSA private key (RS256).
  3. `POST https://{auth-server}/oauth/token` with `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=<signed JWT>`.
  4. Receive `{ access_token, expires_in }`. Cache until expiry.
- **Create envelopes** via the existing DocuSign REST API calls (not covered by this doc — depends on Goosehead's document/policy flows).
- **Generate signing URLs**: `POST /restapi/v2.1/accounts/{accountId}/envelopes/{envelopeId}/views/recipient` with the recipient's details. Response includes a `url` with ~5-minute TTL.
- **Expose the thin mobile endpoint** described below.
- **Handle envelope completion** via DocuSign webhooks (DocuSign Connect) or polling `GET /envelopes/{id}` — mobile's `onSigningComplete` event is a user-experience hook, not an authoritative completion signal.

### Mobile App (already done)

- Calls the new backend endpoint over the existing authenticated session.
- Receives `{ signingUrl, envelopeId }`.
- Invokes `presentCaptiveSigningWithUrl({ signingUrl, envelopeId })` from `react-native-docusign`.
- Listens for `onSigningComplete` / `onSigningCancelled` events to update UI.
- Holds no DocuSign credentials.

### User

- Taps "Sign" in the Goosehead app.
- Signs natively in the DocuSign UI rendered by the SDK.
- Returns to the app. No external browser, no manual URL handling.

## Endpoint Spec

### `POST /api/docusign/signing-url`

**Request**
```http
POST /api/docusign/signing-url
Authorization: Bearer <goosehead-session-token>
Content-Type: application/json

{
  "envelopeId": "string (GUID — the DocuSign envelope to sign)",
  "clientUserId": "string (embedded recipient clientUserId that the envelope was created with)",
  "userName": "string (recipient's display name; must match envelope recipient)",
  "email": "string (recipient's email; must match envelope recipient)",
  "returnUrl": "string (URL DocuSign redirects to after signing; can be any valid URL — the SDK intercepts before it loads)"
}
```

**Response**
```json
{
  "signingUrl": "https://demo.docusign.net/Signing/StartInSession.aspx?t=...",
  "envelopeId": "same GUID echoed back"
}
```

**Errors**
- `404` — envelopeId not found or not owned by the authenticated Goosehead user.
- `409` — envelope already completed / voided.
- `502` — DocuSign API unreachable or returned error (wrap DocuSign's error, don't expose raw payload).

### Backend pseudocode

```python
@app.post("/api/docusign/signing-url")
def get_signing_url(req: SigningUrlRequest, user: GooseheadUser):
    # 1. Authorize: does this user own / have access to the envelope?
    envelope = db.envelopes.get(req.envelope_id)
    assert envelope.owner_id == user.id

    # 2. Get (or cache) a DocuSign access token
    token = docusign_auth.get_token()

    # 3. Ask DocuSign for a recipient view URL
    response = httpx.post(
        f"{docusign_base}/restapi/v2.1/accounts/{DOCUSIGN_ACCOUNT_ID}/envelopes/{req.envelope_id}/views/recipient",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "authenticationMethod": "none",
            "clientUserId": req.client_user_id,
            "userName": req.user_name,
            "email": req.email,
            "returnUrl": req.return_url,
        },
    )
    response.raise_for_status()
    return {
        "signingUrl": response.json()["url"],
        "envelopeId": req.envelope_id,
    }
```

## Security notes

- **Never ship the DocuSign access token or RSA private key to the mobile app.** The signing URL is a short-lived, single-use credential safe to hand to the client; the access token is not.
- **Signing URLs expire in ~5 minutes** and can be used only once. Generate fresh per sign attempt.
- **Authorize the envelope against the requesting user.** Without this check, any authenticated user could request signing URLs for any envelopeId they know or guess.
- **Match recipient fields to the envelope's recipient.** `clientUserId`, `userName`, `email` must match exactly what the envelope was created with, or DocuSign returns a 400. Preferred: backend looks up the recipient from its own DB rather than trusting client-supplied values.
- **DocuSign webhooks (Connect) are the source of truth for envelope completion.** The mobile `onSigningComplete` event is a UX hint; don't update business state solely based on it.

## Environments

| Env | DocuSign Auth Server | DocuSign REST Base |
|---|---|---|
| Demo / UAT | `https://account-d.docusign.com` | `https://demo.docusign.net/restapi` |
| Production | `https://account.docusign.com` | `https://www.docusign.net/restapi` (or account-specific `base_uri` from userinfo) |

Production note: `base_uri` can vary per account (`na3`, `eu`, `au`, etc.). Backend should read it from `GET /oauth/userinfo` once and cache per account, or use the value DocuSign returned when the account was provisioned.

## References

- [DocuSign JWT Bearer Grant](https://developers.docusign.com/platform/auth/jwt/)
- [Create recipient view](https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/envelopeviews/createrecipient/)
- [Embedded Signing concepts](https://developers.docusign.com/docs/esign-rest-api/esign101/concepts/embedding/)
- [DocuSign Native iOS SDK — Embedded Signing without SDK authentication](https://github.com/docusign/native-ios-sdk/blob/master/Embedded-Signing.md#embedded-signing-without-sdk-authentication)
- [react-native-docusign module README](../README.md)

## Mobile usage (for reference)

```ts
import { presentCaptiveSigningWithUrl } from 'react-native-docusign';

const { signingUrl, envelopeId } = await gooseheadApi.post('/api/docusign/signing-url', {
  envelopeId,
  clientUserId: recipient.clientUserId,
  userName: recipient.name,
  email: recipient.email,
  returnUrl: 'https://goosehead.com/signed',
});

const result = await presentCaptiveSigningWithUrl({ signingUrl, envelopeId });
// result.status: 'completed' | 'cancelled' | 'error'
```
