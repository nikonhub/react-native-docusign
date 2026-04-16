# Backend Integration Guide for `react-native-docusign`

This guide explains how to set up a backend that powers in-app DocuSign signing using the `react-native-docusign` package. The mobile app handles the native signing UI; your backend handles authentication, envelope creation, and credential management.

## Overview

The mobile app does **not** handle DocuSign credentials directly. Your backend mints a short-lived access token, creates the envelope, and returns a session payload. The app feeds this payload to the native DocuSign SDK, which opens a fully native PDF viewer + signature capture screen (no WebView).

```
Mobile App                    Your Backend                   DocuSign
    |                              |                              |
    | 1. POST /signing-session     |                              |
    |   { your business params }   |                              |
    |----------------------------->|                              |
    |                              | 2. JWT Bearer Grant          |
    |                              |   (RSA key, scope=signature  |
    |                              |    impersonation)             |
    |                              |----------------------------->|
    |                              | 3. { access_token }          |
    |                              |<-----------------------------|
    |                              |                              |
    |                              | 4. GET /oauth/userinfo       |
    |                              |----------------------------->|
    |                              | 5. { sub, accounts[] }       |
    |                              |<-----------------------------|
    |                              |                              |
    |                              | 6. POST /envelopes           |
    |                              |   (template + embedded       |
    |                              |    signer with clientUserId) |
    |                              |----------------------------->|
    |                              | 7. { envelopeId }            |
    |                              |<-----------------------------|
    |                              |                              |
    | 8. Session payload (13 fields)|                              |
    |<-----------------------------|                              |
    |                              |                              |
    | 9. SDK: initialize()         |                              |
    | 10. SDK: login(token)        |                              |
    | 11. SDK: presentCaptive      |                              |
    |     Signing(envelope)        |                              |
    |                              |                              |
    | 12. Native signing UI opens  |                              |
    |----------------------------------------------------->|
    |                              |                              |
    | User signs                   |                              |
    |                              |                              |
    | 13. onSigningComplete        |                              |
    |     (UX confirmation only)   |                              |
    |                              | 14. DocuSign Connect webhook |
    |                              |<-----------------------------|
    |                              | 15. Update your DB           |
```

## Prerequisites

1. A [DocuSign developer account](https://developers.docusign.com/) (free)
2. An **Integration Key** (client_id) created in DocuSign Admin > Apps and Keys
3. An **RSA keypair** generated and the public key uploaded to your integration
4. **User consent** granted for `signature impersonation` scope ([one-time consent URL](#one-time-consent))
5. **Mobile SDK access** enabled for your integration key (may require contacting DocuSign support to register your iOS bundle ID and Android package name)
6. The `react-native-docusign` package installed in your mobile app

## Session Payload Contract

Your backend endpoint must return this exact JSON shape. The mobile app validates it against a Zod schema at runtime.

```json
{
  "integratorKey": "your-integration-key-guid",
  "environment": "demo",
  "accessToken": "eyJ0eXAiOiJNVCIs...",
  "expiresIn": 3600,
  "host": "https://demo.docusign.net/restapi",
  "accountId": "your-docusign-account-guid",
  "userId": "impersonated-user-guid",
  "userName": "Service Account",
  "email": "service@example.com",
  "envelopeId": "created-envelope-guid",
  "clientUserId": "YOUR_APP_USER_123",
  "recipientName": "John Doe",
  "recipientEmail": "john@example.com"
}
```

### Field reference

| Field | Type | Description |
|-------|------|-------------|
| `integratorKey` | string | Your DocuSign Integration Key (client_id). Used by the SDK for `initialize()`. |
| `environment` | `"demo"` or `"production"` | Determines which DocuSign environment the SDK connects to. |
| `accessToken` | string | Short-lived DocuSign access token minted via JWT Bearer Grant. |
| `expiresIn` | number | Token lifetime in seconds. Keep short (recommended ≤ 900). |
| `host` | string (URL) | DocuSign REST API base URL (e.g. `https://demo.docusign.net/restapi`). |
| `accountId` | string | DocuSign account GUID. |
| `userId` | string | DocuSign user GUID (the impersonated user). |
| `userName` | string | Display name of the impersonated user. |
| `email` | string | Email of the impersonated user. |
| `envelopeId` | string | The envelope GUID created by your backend. |
| `clientUserId` | string | Identifies the signer as "embedded." MUST match the value set on the envelope recipient. |
| `recipientName` | string | Signer's name. MUST exactly match the recipient on the envelope. |
| `recipientEmail` | string | Signer's email. MUST exactly match the recipient on the envelope. |

## Step-by-Step Backend Implementation

### Step 1: Store credentials securely

Store these in a secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.). Never commit them to source control.

- **Integration Key** (client_id): GUID from DocuSign Admin
- **RSA private key**: the private half of the keypair you uploaded to DocuSign
- **Impersonated User ID**: the DocuSign user GUID your app acts on behalf of

### Step 2: Mint an access token (JWT Bearer Grant)

Build a JWT assertion, sign it with your RSA private key, and exchange it for an access token.

```typescript
import { ApiClient } from 'docusign-esign';
import fs from 'fs';

const INTEGRATION_KEY = process.env.DOCUSIGN_INTEGRATION_KEY;
const USER_ID = process.env.DOCUSIGN_USER_ID;
const RSA_PRIVATE_KEY = fs.readFileSync(process.env.DOCUSIGN_RSA_KEY_PATH);

const apiClient = new ApiClient();
apiClient.setOAuthBasePath('account-d.docusign.com'); // or 'account.docusign.com' for production

const tokenResponse = await apiClient.requestJWTUserToken(
  INTEGRATION_KEY,
  USER_ID,
  ['signature', 'impersonation'],
  RSA_PRIVATE_KEY,
  3600 // token lifetime in seconds
);

const accessToken = tokenResponse.body.access_token;
const expiresIn = tokenResponse.body.expires_in;
```

**Manual approach** (without the SDK, using `jsonwebtoken` + `axios`):

```typescript
import jwt from 'jsonwebtoken';
import axios from 'axios';

const now = Math.floor(Date.now() / 1000);
const assertion = jwt.sign(
  {
    iss: INTEGRATION_KEY,
    sub: USER_ID,
    aud: 'account-d.docusign.com',
    iat: now,
    exp: now + 3600,
    scope: 'signature impersonation',
  },
  RSA_PRIVATE_KEY,
  { algorithm: 'RS256' }
);

const { data } = await axios.post('https://account-d.docusign.com/oauth/token', null, {
  params: {
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  },
});

const accessToken = data.access_token;
const expiresIn = data.expires_in;
```

Cache the token until it expires. Do not mint a new one per request.

### Step 3: Resolve account metadata

Call `/oauth/userinfo` to get the account ID, base URI, and user details.

```typescript
const userInfoResponse = await apiClient.getUserInfo(accessToken);
const account = userInfoResponse.accounts.find(a => a.isDefault) ?? userInfoResponse.accounts[0];
const basePath = `${account.baseUri}/restapi`;
```

Cache this per account. The `baseUri` varies by region (e.g. `na2.docusign.net`, `eu.docusign.net`, `au.docusign.net`). Never hardcode it.

### Step 4: Create an envelope with an embedded signer

The signer **must** have `clientUserId` set. This marks them as "embedded" (captive). Without it, DocuSign treats the signer as "remote" and sends them an email/SMS link instead. The SDK cannot open remote-signer envelopes.

```typescript
import { EnvelopesApi } from 'docusign-esign';

apiClient.setBasePath(basePath);
apiClient.addDefaultHeader('Authorization', `Bearer ${accessToken}`);

const envelopesApi = new EnvelopesApi(apiClient);

const envelopeResult = await envelopesApi.createEnvelope(account.accountId, {
  envelopeDefinition: {
    emailSubject: 'Please sign this document',
    status: 'sent',
    documents: [{
      documentBase64: documentBase64Content,
      name: 'document.pdf',
      fileExtension: 'pdf',
      documentId: '1',
    }],
    recipients: {
      signers: [{
        email: recipientEmail,
        name: recipientName,
        recipientId: '1',
        routingOrder: '1',
        clientUserId: clientUserId, // required for embedded signing
        tabs: {
          signHereTabs: [{
            documentId: '1',
            pageNumber: '1',
            xPosition: '100',
            yPosition: '600',
          }],
        },
      }],
    },
  },
});

const envelopeId = envelopeResult.envelopeId;
```

You can also use DocuSign templates instead of inline documents:

```typescript
const envelopeResult = await envelopesApi.createEnvelope(account.accountId, {
  envelopeDefinition: {
    emailSubject: 'Please sign this document',
    status: 'sent',
    templateId: 'your-template-guid',
    templateRoles: [{
      name: recipientName,
      email: recipientEmail,
      roleName: 'Signer', // must match the role name in the template
      clientUserId: clientUserId,
    }],
  },
});
```

### Step 5: Assemble and return the session payload

```typescript
return {
  integratorKey: INTEGRATION_KEY,
  environment: 'demo', // or 'production'
  accessToken,
  expiresIn: Math.min(expiresIn, 900),
  host: basePath,
  accountId: account.accountId,
  userId: userInfoResponse.sub,
  userName: userInfoResponse.name,
  email: userInfoResponse.email,
  envelopeId,
  clientUserId,
  recipientName,
  recipientEmail,
};
```

### Step 6: Handle envelope completion (webhook)

The mobile app's `onSigningComplete` event is a **UX hint only**, not an authoritative completion signal. Set up a [DocuSign Connect](https://developers.docusign.com/platform/webhooks/connect/) webhook to receive envelope status events on your backend.

Events to listen for: `sent`, `delivered`, `completed`, `declined`, `voided`.

```typescript
// POST /webhooks/docusign (your webhook endpoint)
app.post('/webhooks/docusign', (req, res) => {
  const event = req.body;
  const envelopeId = event.envelopeId;
  const status = event.status; // 'completed', 'declined', 'voided', etc.

  // Update your database
  await db.envelopes.updateStatus(envelopeId, status);

  // Optionally send push notification to the user
  if (status === 'completed') {
    await pushNotifications.send(userId, 'Your document has been signed.');
  }

  res.sendStatus(200);
});
```

## One-Time Consent

The first time your integration key impersonates a user, DocuSign requires the user to grant consent. Open this URL in a browser (once per user):

```
https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=YOUR_INTEGRATION_KEY&redirect_uri=YOUR_REDIRECT_URI
```

For production, replace `account-d` with `account`.

After the user grants consent, JWT Bearer Grant works for that user without further interaction.

## Full Example (Express + TypeScript)

```typescript
import express from 'express';
import { ApiClient, EnvelopesApi } from 'docusign-esign';
import fs from 'fs';

const app = express();
app.use(express.json());

const INTEGRATION_KEY = process.env.DOCUSIGN_INTEGRATION_KEY!;
const USER_ID = process.env.DOCUSIGN_USER_ID!;
const RSA_KEY = fs.readFileSync(process.env.DOCUSIGN_RSA_KEY_PATH!);
const ENVIRONMENT = (process.env.DOCUSIGN_ENV as 'demo' | 'production') ?? 'demo';
const AUTH_SERVER = ENVIRONMENT === 'demo' ? 'account-d.docusign.com' : 'account.docusign.com';

let cachedToken: { token: string; expiresAt: number } | null = null;
let cachedAccount: { accountId: string; basePath: string; userId: string; userName: string; email: string } | null = null;

async function getAccessToken(): Promise<{ accessToken: string; expiresIn: number }> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    const remaining = Math.floor((cachedToken.expiresAt - Date.now()) / 1000);
    return { accessToken: cachedToken.token, expiresIn: remaining };
  }

  const apiClient = new ApiClient();
  apiClient.setOAuthBasePath(AUTH_SERVER);

  const response = await apiClient.requestJWTUserToken(
    INTEGRATION_KEY, USER_ID, ['signature', 'impersonation'], RSA_KEY, 3600
  );

  const accessToken = response.body.access_token;
  const expiresIn = response.body.expires_in;
  cachedToken = { token: accessToken, expiresAt: Date.now() + (expiresIn - 60) * 1000 };

  return { accessToken, expiresIn };
}

async function getAccountInfo(accessToken: string) {
  if (cachedAccount) return cachedAccount;

  const apiClient = new ApiClient();
  apiClient.setOAuthBasePath(AUTH_SERVER);
  const userInfo = await apiClient.getUserInfo(accessToken);
  const account = userInfo.accounts.find(a => a.isDefault) ?? userInfo.accounts[0];

  cachedAccount = {
    accountId: account.accountId,
    basePath: `${account.baseUri}/restapi`,
    userId: userInfo.sub,
    userName: userInfo.name,
    email: userInfo.email,
  };

  return cachedAccount;
}

app.post('/api/docusign/signing-session', async (req, res) => {
  try {
    const { documentBase64, recipientName, recipientEmail, clientUserId, emailSubject } = req.body;

    // 1. Get access token
    const { accessToken, expiresIn } = await getAccessToken();

    // 2. Resolve account
    const account = await getAccountInfo(accessToken);

    // 3. Create envelope with embedded signer
    const apiClient = new ApiClient();
    apiClient.setBasePath(account.basePath);
    apiClient.addDefaultHeader('Authorization', `Bearer ${accessToken}`);

    const envelopesApi = new EnvelopesApi(apiClient);
    const envelopeResult = await envelopesApi.createEnvelope(account.accountId, {
      envelopeDefinition: {
        emailSubject: emailSubject ?? 'Please sign this document',
        status: 'sent',
        documents: [{
          documentBase64,
          name: 'document.pdf',
          fileExtension: 'pdf',
          documentId: '1',
        }],
        recipients: {
          signers: [{
            email: recipientEmail,
            name: recipientName,
            recipientId: '1',
            routingOrder: '1',
            clientUserId,
            tabs: {
              signHereTabs: [{ documentId: '1', pageNumber: '1', xPosition: '100', yPosition: '600' }],
            },
          }],
        },
      },
    });

    // 4. Return session payload
    res.json({
      integratorKey: INTEGRATION_KEY,
      environment: ENVIRONMENT,
      accessToken,
      expiresIn: Math.min(expiresIn, 900),
      host: account.basePath,
      accountId: account.accountId,
      userId: account.userId,
      userName: account.userName,
      email: account.email,
      envelopeId: envelopeResult.envelopeId,
      clientUserId,
      recipientName,
      recipientEmail,
    });
  } catch (error) {
    console.error('Signing session error:', error);
    res.status(502).json({ error: 'Failed to create signing session' });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

## Mobile Usage

Once your backend returns the session payload, the mobile app uses it like this:

```typescript
import { initialize, loginWithAccessToken, presentCaptiveSigning } from 'react-native-docusign';

// 1. Fetch session from your backend
const session = await api.post('/api/docusign/signing-session', {
  documentBase64,
  recipientName: 'John Doe',
  recipientEmail: 'john@example.com',
  clientUserId: 'USER_123',
});

// 2. Initialize SDK (once per cold start)
await initialize({
  integratorKey: session.integratorKey,
  environment: session.environment,
});

// 3. Login with backend-minted token
await loginWithAccessToken({
  accessToken: session.accessToken,
  accountId: session.accountId,
  userId: session.userId,
  userName: session.userName,
  email: session.email,
  host: session.host,
  expiresIn: session.expiresIn,
});

// 4. Open native signing UI
const result = await presentCaptiveSigning({
  envelopeId: session.envelopeId,
  recipientUserName: session.recipientName,
  recipientEmail: session.recipientEmail,
  recipientClientUserId: session.clientUserId,
});

// result.status: 'completed' | 'cancelled' | 'error'
```

## Security Checklist

- [ ] RSA private key stored in secrets manager, never in source control
- [ ] Access tokens short-lived (≤ 15 min recommended)
- [ ] Backend authorizes every request (user owns the envelope / resource)
- [ ] `clientUserId`, `recipientName`, `recipientEmail` resolved server-side, not trusted from client
- [ ] DocuSign Connect webhook set up for authoritative envelope completion
- [ ] Rate limiting on the signing-session endpoint

## Environments

| Environment | Auth Server | REST Base |
|-------------|-------------|-----------|
| Demo / Development | `account-d.docusign.com` | `https://demo.docusign.net/restapi` |
| Production | `account.docusign.com` | per-account `base_uri` from `/oauth/userinfo` + `/restapi` |

## Supported Tab Types (Mobile SDK)

Not all DocuSign tab types render in the mobile SDK. Plan your templates accordingly.

**Supported:** Signature, Initials, First Name, Last Name, Text, Full Name, Company, Title, Date Signed, Checkbox, List, Radio.

**Unsupported:** Email, Approve, Decline, Date, Formula, Envelope Id, Note, Notarize, Number, Signer Attachment, SSN, View, Zip, Email address.

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `login_failed: unauthorized` (token valid via `/oauth/userinfo`) | Mobile SDK not enabled for integration key, or bundle ID / package name not registered | Contact DocuSign support to enable Mobile SDK access |
| `login_failed: unauthorized` (token rejected by `/oauth/userinfo`) | Token expired or minted with wrong scope | Re-mint with `scope=signature impersonation` |
| `consent_required` on JWT grant | User has not granted impersonation consent | Open [consent URL](#one-time-consent) in browser |
| `RECIPIENT_NOT_IN_ENVELOPE` | `clientUserId` / `recipientName` / `recipientEmail` mismatch | Ensure values exactly match the envelope signer |
| `ENVELOPE_IS_NOT_IN_CORRECT_STATE` | Envelope status is not `sent` | Ensure `status: 'sent'` when creating the envelope |

## References

- [DocuSign JWT Bearer Grant](https://developers.docusign.com/platform/auth/jwt/)
- [DocuSign OAuth Userinfo](https://developers.docusign.com/platform/auth/reference/obtain-user-info/)
- [DocuSign Node.js SDK (`docusign-esign`)](https://github.com/docusign/docusign-esign-node-client)
- [Create Envelope API](https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/envelopes/create/)
- [Embedded Signing Concepts](https://developers.docusign.com/docs/esign-rest-api/esign101/concepts/embedding/)
- [DocuSign Connect Webhooks](https://developers.docusign.com/platform/webhooks/connect/)
- [DocuSign Native iOS SDK](https://github.com/docusign/native-ios-sdk)
- [DocuSign Native Android SDK](https://github.com/docusign/native-android-sdk)
- [`react-native-docusign` README](../README.md)
