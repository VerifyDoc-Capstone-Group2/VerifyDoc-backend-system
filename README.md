# VerifyDoc API Documentation

| Field | Value |
|---|---|
| Version | 1.0 |
| Status | Approved |
| Last Updated | 14/10/2026 |
| Owner | VerifyDoc |
| Audience | Developers integrating with the VerifyDoc API |
| Base URL | https://verifydoc-api-v1.onrender.com|
| API Version | 1.0 |
| Auth Method | Bearer token (JWT) |

## 1. Introduction

The VerifyDoc API is a REST API that powers the VerifyDoc credential-verification platform. It lets your application register users, store and manage credentials, share credentials with approved employers, and request fresh confirmation from issuing institutions.

This documentation is for **developers building client applications** (web and mobile) on top of VerifyDoc.

By the end of this documentation, you'll be able to:

- Authenticate users and make authorized API calls
- Register citizens, employers, and institutions
- Issue, upload, and manage credentials
- Share credentials with approved employers and track those shares
- Request and respond to fresh confirmations

> **Note:** This documentation describes VerifyDoc's current implemented behavior. It is not an independently tested public API contract. IDs, dates, hosts, and tokens in examples are placeholders, and database-generated fields may vary.



## 2. Getting Started

This section covers what you need to send your first successful request.

### 2.1 Base URL

All paths in this documentation are relative to your deployed API origin, for example `https://api.example.com`. A production hostname has not been established yet, so use the origin your backend team provides.

To confirm the server is reachable, send `GET /`. It returns the plain text `Server is running`, not JSON.

### 2.2 Request Headers

Set these headers on your requests:

| Header | When to use | Value |
|---|---|---|
| `Content-Type` | Requests with a JSON body | `application/json` |
| `Authorization` | Protected endpoints | `Bearer <access_token>` |

For file uploads, send `multipart/form-data` and let your HTTP client generate the multipart boundary. Do not set it manually.

### 2.3 Make Your First Call

Follow these steps to register, log in, and retrieve your own user record.

1. Send `GET /` and confirm the response says `Server is running`.
2. Register a Citizen account with `POST /auth/register` (full reference in Section 5.1):

```json
   {
     "firstName": "Ada",
     "lastName": "Okafor",
     "email": "ada@example.com",
     "password": "ExamplePass123",
     "role": "Citizen",
     "phoneNumber": "08012345678"
   }
```

3. Log in with `POST /auth/login` and copy the `token` value from `data.token` in the response.
4. Request your user record with the token:

```bash
   curl https://api.example.com/auth/me \
     -H "Authorization: Bearer <access_token>"
```

A `200` response returns your user details. A `401` response means the token is missing or invalid.



## 3. Authentication

VerifyDoc uses JSON Web Tokens (JWTs) for API access. Protected endpoints require a valid access token. Password reset and email verification use separate one-time codes and tokens, covered below.

### 3.1 Access Tokens

Logging in returns an access token. Include it in the `Authorization` header of every protected request:

```
Authorization: Bearer <access_token>
```

Keep these rules in mind:

- Access tokens are valid for **1 day**.
- There is no refresh-token mechanism yet. When a token expires, log in again.
- A missing or invalid token returns `401`.
- A `resetToken` (issued during password reset) is **not** an access token. Never send it as one.
- Never log passwords, one-time codes, reset tokens, or JWTs.

### 3.2 Log In

Authenticates a user and returns an access token.

**Endpoint:** `POST /auth/login`
**Access:** Public

**Request parameters**

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | string | Yes | The registered email address |
| `password` | string | Yes | The account password |

**Example request**

```json
{
  "email": "ada@example.com",
  "password": "ExamplePass123"
}
```

**Success response · 200**

```json
{
  "message": "User logged in successfully",
  "data": {
    "token": "<JWT_ACCESS_TOKEN>",
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "firstName": "Ada",
      "lastName": "Okafor",
      "email": "ada@example.com",
      "role": "Citizen",
      "accountStatus": "Active",
      "isEmailVerified": false
    }
  }
}
```

**Errors**

| Status | Message | Cause |
|---|---|---|
| 400 | Invalid email or password | Credentials don't match an account |

**Notes**
- Store the token securely on the client.

### 3.3 Get the Current User

Returns the account details for the token's owner.

**Endpoint:** `GET /auth/me`
**Access:** Bearer token

**Request body:** None.

**Success response · 200**

```json
{
  "message": "Current user retrieved successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "firstName": "Ada",
    "lastName": "Okafor",
    "email": "ada@example.com",
    "role": "Citizen",
    "accountStatus": "Active",
    "isEmailVerified": false
  }
}
```

**Errors**

| Status | Message | Cause |
|---|---|---|
| 401 | Authentication token required | No token was sent |

**Notes**
- Use this endpoint after login, or on app start, to check a stored token is still valid.

### 3.4 Reset a Forgotten Password

Password reset is a three-step flow that uses a one-time code sent by email. Complete the steps in order:

1. Request a code with `POST /auth/forgot-password`.
2. Exchange the code for a reset token with `POST /auth/forgot-password/verify`.
3. Set the new password with `POST /auth/reset-password`.

If the code doesn't arrive, request another with `POST /auth/resend-password-otp`.

#### Request a Reset Code

Sends a password-reset code to the account's email address.

**Endpoint:** `POST /auth/forgot-password`
**Access:** Public

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | string | Yes | The account email address |

**Example request**

```json
{ "email": "ada@example.com" }
```

**Success response · 200**

```json
{
  "message": "If an account exists with that email, a password reset code has been sent."
}
```

**Errors**

| Status | Message | Cause |
|---|---|---|
| 400 | Invalid data passed into email | The email value is invalid |

**Notes**
- The success message is the same whether or not the account exists. This protects against account enumeration, so don't build UI that depends on the difference.
- Reset codes expire after 10 minutes.

#### Verify the Reset Code

Exchanges the emailed code for a One-Time-Password (OTP).

**Endpoint:** `POST /auth/forgot-password/verify`
**Access:** Public

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | string | Yes | The account email address |
| `otp` | string | Yes | The code received by email |

**Example request**

```json
{
  "email": "ada@example.com",
  "otp": "123456"
}
```

**Success response · 200**

```json
{
  "message": "OTP verified successfully",
  "data": {
    "resetToken": "<SHORT_LIVED_RESET_TOKEN>"
  }
}
```

**Errors**

| Status | Message | Cause |
|---|---|---|
| 400 | Invalid OTP | The code is wrong or expired |

#### Set a New Password

Sets a new password using the reset token.

**Endpoint:** `POST /auth/reset-password`
**Access:** Public; reset token required

| Field | Type | Required | Description |
|---|---|---|---|
| `resetToken` | string | Yes | The token from the verify step |
| `newPassword` | string | Yes | The new password |

**Example request**

```json
{
  "resetToken": "<SHORT_LIVED_RESET_TOKEN>",
  "newPassword": "NewExamplePass123"
}
```

**Success response · 200**

```json
{ "message": "Password reset successfully" }
```

**Errors**

| Status | Message | Cause |
|---|---|---|
| 401 | Reset token is invalid or has expired | The token is wrong or past its lifetime |

#### Resend the Reset Code

Sends a new password-reset code.

**Endpoint:** `POST /auth/resend-password-otp`
**Access:** Public

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | string | Yes | The account email address |

**Success response · 200**

```json
{
  "message": "If an account exists with that email, a new password reset code has been sent."
}
```

**Errors**

| Status | Message | Cause |
|---|---|---|
| 400 | Invalid data passed into email | The email value is invalid |

### 3.5 Verify an Email Address

New accounts start with `isEmailVerified: false`. A verification code is sent by email after registration, and you can request another at any time.

#### Send a Verification Code

Sends an email-verification code to an unverified account.

**Endpoint:** `POST /auth/email/send-verification`
**Access:** Public

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | string | Yes | The account email address |

**Success response · 200**

```json
{
  "message": "If the account exists and is not verified, a verification code has been sent."
}
```

**Errors**

| Status | Message | Cause |
|---|---|---|
| 400 | Email is already verified | The account is already verified |

#### Verify the Code

Confirms the emailed code and marks the email as verified.

**Endpoint:** `POST /auth/email/verify`
**Access:** Public

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | string | Yes | The account email address |
| `otp` | string | Yes | The code received by email |

**Example request**

```json
{
  "email": "ada@example.com",
  "otp": "123456"
}
```

**Success response · 200**

```json
{
  "message": "Email verified successfully",
  "data": { "isEmailVerified": true }
}
```

**Errors**

| Status | Message | Cause |
|---|---|---|
| 400 | Invalid verification code | The code is wrong or expired |

**Notes**
- Changing an email address through `PATCH /users/me` resets `isEmailVerified` to `false`. Prompt the user to verify again.

## 4. Conventions

These conventions apply across the API. Read this section once, and the endpoint reference in Section 5 will be easier to follow.

### 4.1 Response Format

Successful responses wrap the result in a `message` and a `data` block:

```json
{
  "message": "Current user retrieved successfully",
  "data": { }
}
```

Some one-time-code and password endpoints return only a `message`. Errors also return a single `message`:

```json
{
  "message": "Invalid or expired token"
}
```

**Notes**
- The `message` text varies by endpoint. Use the HTTP status code to decide how your app responds, and treat the message as human-readable text.
- Unexpected server failures return `{ "message": "Internal server error" }`.

### 4.2 ID Types

VerifyDoc uses two kinds of IDs, and each endpoint expects a specific one. Check the endpoint's entry before you send an ID.

| ID type | Looks like | Used for |
|---|---|---|
| Database ID (MongoDB ObjectId) | `507f1f77bcf86cd799439011` (24 hexadecimal characters) | Users, `citizenId`, `shareId`, `requestId` |
| Credential ID | `VDOC-CRED-12345678` | Credentials |
| Organization business ID | `VDOC-ORG-NOV-1234` | Admin approval URLs for employer organizations |
| Institution business ID | `VDOC-INS-UNI-1234` | Admin approval URLs for institutions |

**Notes**
- When you share a credential, send the organization's **database ID** as `organizationId`, not the `VDOC-ORG-…` code.
- Treat IDs as opaque text. Don't parse or build them yourself.

### 4.3 Pagination

Long lists return in pages instead of all at once. Each paginated response includes values that tell you where you are in the list:

| Lists | Pagination fields |
|---|---|
| Most credential and sharing lists | `page`, `limit`, `total`, `totalPages` |
| Admin users list | `currentPage`, `limit`, `totalUsers`, `totalPages` |

Check each endpoint's example response to see where these values appear.

> Needs input from: Backend. Confirm the query parameter names clients use to request a page and set the page size, and the default and maximum `limit`.

### 4.4 File Uploads

Endpoints that accept files use `multipart/form-data` instead of JSON. These include credential upload, organization and institution registration, and profile updates that change a picture.

Follow these rules when you send a file:

- Set the request type to `multipart/form-data`.
- Let your HTTP client generate the multipart boundary. Don't set it manually.
- Keep each file under **5 MB**. This limit applies to profile pictures and documents.
- For organization registration, send the `organization` and `user` fields as JSON-encoded strings inside the multipart form (see Section 5.2).
- For profile updates, send JSON for text changes and multipart only when you replace a picture.

**Notes**
- Credential and registration documents are PDFs.

### 4.5 Error Codes

When a request fails, the HTTP status code tells you why. Not every endpoint returns every code, so each endpoint's error table in Section 5 lists the ones it can return.

| Status | Meaning | Typical cause |
|---|---|---|
| 400 | Validation error | Missing, invalid, or malformed input |
| 401 | Not authenticated | Token is missing, invalid, or expired |
| 403 | Forbidden | You're logged in, but your role or account status doesn't allow this action |
| 404 | Not found | The ID doesn't match a record |
| 409 | Conflict | The request conflicts with the current state, such as sharing a credential that isn't active and verified |
| 429 | Too many requests | You've hit a rate limit (see 4.6) |
| 500 | Internal server error | An unexpected failure on the server |

**Notes**
- A `401` on a token that used to work usually means it has expired. Access tokens last 1 day, so send the user back to log in.

### 4.6 Rate Limits

A rate limit caps how many requests you can send in a given time. Requests over the limit return `429`.

The only documented limit applies to the public credential verification endpoint (`GET /credentials/verify/:credentialId`): **30 requests per minute per IP address**.

**Notes**
- Wait before retrying after a `429`.
- No limits are documented for other endpoints. Rate limiting on authentication endpoints is planned but not yet in place.

> **Privacy reminder:** Never log passwords, one-time codes, reset tokens, JWTs, signed QR tokens, or private credential documents. Employer-facing share responses intentionally omit document URLs, so don't try to display them.

## 5. Endpoint Reference

This section documents each endpoint, grouped by the resource it works with. Every entry follows the same structure: purpose, endpoint and access, request fields, examples, errors, and notes. Endpoints without a full entry are listed in Section 5.9.

### 5.1 Users and Profile

These endpoints create and manage user accounts.

#### Register a Citizen Account

Creates a new Citizen account.

**Endpoint:** `POST /auth/register`
**Access:** Public

**Request body**

Send JSON, or `multipart/form-data` if you include a profile picture.

| Field | Type | Required | Description |
|---|---|---|---|
| `firstName` | string | Yes | The citizen's first name |
| `lastName` | string | Yes | The citizen's last name |
| `email` | string | Yes | The email address used to log in |
| `password` | string | Yes | At least 8 characters |
| `role` | string | Yes | Send `Citizen` |
| `phoneNumber` | string | Yes | The citizen's phone number |
| `profilePicture` | file | No | A profile image, up to 5 MB (multipart only) |

**Example request**

```json
{
  "firstName": "Ada",
  "lastName": "Okafor",
  "email": "ada@example.com",
  "password": "ExamplePass123",
  "role": "Citizen",
  "phoneNumber": "08012345678"
}
```

**Success response · 201**

```json
{
  "message": "User created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "firstName": "Ada",
    "lastName": "Okafor",
    "email": "ada@example.com",
    "role": "Citizen",
    "accountStatus": "Active",
    "isEmailVerified": false
  }
}
```

**Errors**

| Status | Message | Cause |
|---|---|---|
| 400 | Password must be 8 or more than 8 character | The password is too short |

**Notes**
- A verification code is sent to the email address after the account is created. New accounts start with `isEmailVerified: false`. See Section 3.5 to verify the email.
- Organizations and institutions register through separate endpoints (see Section 5.9).

> Needs input from: Backend. The required flags above are inferred from the example request. Confirm which fields are mandatory and any validation rules beyond password length.

### 5.2 Organization and Institution Onboarding

Employer organizations and institutions register through their own endpoints and need Platform Admin approval before they can use protected features. These endpoints are summarized in Section 5.9.

### 5.3 Admin

Admin endpoints let the Platform Admin review and approve onboarding requests and view platform data. They are summarized in Section 5.9.

### 5.4 Credentials and Wallet

These endpoints issue, upload, list, view, verify, and revoke credentials.

Each credential carries two separate status fields, so read both:

| Field | Values | Meaning |
|---|---|---|
| `verificationStatus` | `Pending`, `Verified`, `Rejected` | Whether the issuing institution has confirmed the credential |
| `status` | `Active`, `Revoked` | Whether the credential is currently in force |

#### Issue or Upload a Credential

Creates a credential. Citizens use this endpoint to upload a credential for their institution to review. Institutions use it to issue a credential to a citizen.

**Endpoint:** `POST /credentials`
**Access:** Bearer token; active Citizen or approved Institution

**Request body**

Send `multipart/form-data`.

| Field | Type | Required | Description |
|---|---|---|---|
| `credentialType` | string | Confirm | The type of credential, such as `Degree` |
| `title` | string | Confirm | The credential's title, such as `B.Sc Chemistry` |
| `issueDate` | string | Confirm | The issue date, in `YYYY-MM-DD` format |
| `fieldOfStudy` | string | Confirm | The field of study |
| `graduationYear` | string | Confirm | The year of graduation |
| `document` | file | Yes | The credential document: a PDF, up to 5 MB |
| `issuerName` | string | Citizen uploads | The name of the issuing institution |
| `institution` | string | No (Citizen uploads) | The database ID of a registered institution |
| `citizenId` | string | Institution issues | The database ID of the citizen receiving the credential |

**Example request: citizen upload**

```text
credentialType: Degree
title: B.Sc Chemistry
issueDate: 2025-07-01
fieldOfStudy: Chemistry
graduationYear: 2025
issuerName: Example University
document: <PDF file>
```

**Example request: institution issue**

```text
credentialType: Degree
title: B.Sc Chemistry
issueDate: 2025-07-01
fieldOfStudy: Chemistry
graduationYear: 2025
citizenId: 507f1f77bcf86cd799439011
document: <PDF file>
```

**Success response · 201**

```json
{
  "message": "Credential created successfully",
  "data": {
    "credentialId": "VDOC-CRED-12345678",
    "issuerName": "Example University",
    "credentialType": "Degree",
    "title": "B.Sc Chemistry",
    "issueDate": "2025-07-01T00:00:00.000Z",
    "verificationStatus": "Pending",
    "status": "Active",
    "_id": "507f1f77bcf86cd799439066",
    "source": "Citizen"
  }
}
```

This example shows a citizen upload.

**Errors**

| Status | Message | Cause |
|---|---|---|
| 400 | A PDF document is required | No PDF was attached |

**Notes**
- **Citizens:** send `issuerName`, and optionally `institution`. The credential starts as `Pending` until the issuing institution verifies or rejects it.
- **Institutions:** send `citizenId`. Do not send `issuerName` or `institution`, because the backend determines the issuer.
- Use the `credentialId` in the response (`VDOC-CRED-…`) in later requests.

> Needs input from: Backend. Confirm (1) which descriptive fields are required and the allowed `credentialType` values, and (2) what `verificationStatus` an institution-issued credential returns.

#### View the Citizen Wallet

Returns a page of the logged-in citizen's credentials.

**Endpoint:** `GET /credentials/wallet`
**Access:** Bearer token; active Citizen

**Query parameters**

All parameters are optional.

| Parameter | Type | Description |
|---|---|---|
| `page` | integer | The page number |
| `limit` | integer | Results per page; maximum 50 |
| `verificationStatus` | string | Filter by `Pending`, `Verified`, or `Rejected` |
| `status` | string | Filter by `Active` or `Revoked` |
| `source` | string | Filter by `Citizen` (uploaded) or `Institution` (issued) |

**Example request**

```http
GET /credentials/wallet?page=1&limit=10&verificationStatus=Verified
Authorization: Bearer <access_token>
```

**Success response · 200**

```json
{
  "message": "Citizen credentials retrieved successfully",
  "data": {
    "credentials": [
      {
        "credentialId": "VDOC-CRED-12345678",
        "issuerName": "Example University",
        "credentialType": "Degree",
        "title": "B.Sc Chemistry",
        "issueDate": "2025-07-01T00:00:00.000Z",
        "verificationStatus": "Verified",
        "status": "Active"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

**Errors**

| Status | Message | Cause |
|---|---|---|
| 403 | Only Citizens can access a Citizen wallet | The token belongs to a non-citizen account |

**Notes**
- Combine filters to narrow the list, such as `verificationStatus=Verified&status=Active`.
- Use `totalPages` to decide whether to request another page.

#### Get a Credential

Returns the full record for one credential.

**Endpoint:** `GET /credentials/:credentialId`
**Access:** Bearer token; the credential's owner (Citizen) or its issuing Institution

**Path parameters**

| Parameter | Type | Description |
|---|---|---|
| `credentialId` | string | The credential ID, such as `VDOC-CRED-12345678` |

**Request body:** None.

**Success response · 200**

```json
{
  "message": "Credential retrieved successfully",
  "data": {
    "credentialId": "VDOC-CRED-12345678",
    "issuerName": "Example University",
    "credentialType": "Degree",
    "title": "B.Sc Chemistry",
    "issueDate": "2025-07-01T00:00:00.000Z",
    "verificationStatus": "Verified",
    "status": "Active",
    "document": {
      "url": "https://files.example.com/private.pdf",
      "publicId": "private-document-id"
    }
  }
}
```

**Errors**

| Status | Message | Cause |
|---|---|---|
| 403 | You are not authorized to access this credential | The caller is neither the owner nor the issuing institution |

**Notes**
- Use the credential ID (`VDOC-CRED-…`) in the path, not the database ID.
- The full record includes the private document link. Never expose it to employers or organizations. They see only the limited view returned through credential sharing.

#### Verify an Uploaded Credential

Confirms that a citizen-uploaded credential is genuine. The credential's `verificationStatus` changes from `Pending` to `Verified`.

**Endpoint:** `PATCH /credentials/:credentialId/verify`
**Access:** Bearer token; approved issuing Institution

**Path parameters**

| Parameter | Type | Description |
|---|---|---|
| `credentialId` | string | The credential ID, such as `VDOC-CRED-12345678` |

**Request body:** None.

**Success response · 200**

```json
{
  "message": "Credential verified successfully",
  "data": {
    "credentialId": "VDOC-CRED-12345678",
    "issuerName": "Example University",
    "credentialType": "Degree",
    "title": "B.Sc Chemistry",
    "issueDate": "2025-07-01T00:00:00.000Z",
    "verificationStatus": "Verified",
    "status": "Active"
  }
}
```

**Errors**

| Status | Message | Cause |
|---|---|---|
| 409 | Only active, pending credentials can be verified | The credential isn't citizen-uploaded, isn't active, or is no longer pending |

**Notes**
- Only citizen-uploaded credentials in `Pending` status can be verified. To decline an upload instead, use the reject endpoint listed in Section 5.9.

#### Revoke a Credential

Revokes a credential that an institution has issued. Once revoked, treat the credential as no longer valid.

**Endpoint:** `PATCH /credentials/:credentialId/revoke`
**Access:** Bearer token; approved issuing Institution

**Path parameters**

| Parameter | Type | Description |
|---|---|---|
| `credentialId` | string | The credential ID, such as `VDOC-CRED-12345678` |

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `revocationReason` | string | No | Explains why the credential is being revoked |

**Example request**

```json
{
  "revocationReason": "Issued in error"
}
```

**Success response · 200**

```json
{
  "message": "Credential revoked successfully",
  "data": {
    "credentialId": "VDOC-CRED-12345678",
    "issuerName": "Example University",
    "credentialType": "Degree",
    "title": "B.Sc Chemistry",
    "issueDate": "2025-07-01T00:00:00.000Z",
    "verificationStatus": "Verified",
    "status": "Revoked",
    "revocationReason": "Issued in error"
  }
}
```

**Errors**

| Status | Message | Cause |
|---|---|---|
| 409 | Only active verified credentials can be revoked | The credential doesn't meet the conditions required for revocation |

**Notes**
- Only the institution that issued a credential can revoke it.
- The response keeps `verificationStatus` as `Verified` and sets `status` to `Revoked`. Check both fields.

> Needs input from: Backend. The source entry didn't state the status code for the 409 error. Confirm it.

### 5.5 QR Verification

QR endpoints generate a credential's QR code and check a credential through a signed link. They are summarized in Section 5.9. See Section 6.6 for the full workflow.

### 5.6 Credential Sharing

These endpoints let citizens choose who can see a credential, and let employers view what is shared with them. Each share has one of these `status` values: `Active`, `Expired`, `Revoked`, or `Unavailable`.

> Needs input from: Backend. The source entries for the citizen sharing endpoints below didn't state which request fields are required, so those columns say "Confirm".

#### List Eligible Organizations

Returns the active employer organizations a citizen can share a credential with.

**Endpoint:** `GET /credential-shares/eligible-organizations`
**Access:** Bearer token; active Citizen

**Query parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `page` | number | Confirm | The page number |
| `limit` | number | Confirm | Results per page; maximum 10 |

**Example request**

```http
GET /credential-shares/eligible-organizations?page=1&limit=10
Authorization: Bearer <access_token>
```

**Success response · 200**

```json
{
  "message": "Eligible organizations retrieved successfully",
  "data": {
    "organizations": [
      {
        "_id": "507f1f77bcf86cd799439022",
        "organizationName": "NovaBridge Ltd",
        "organizationType": "Employer",
        "organizationId": "VDOC-ORG-NOV-1234"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

**Errors**

| Status | Message | Cause |
|---|---|---|
| 403 | Citizen access required | The token doesn't belong to a citizen account |

**Notes**
- Only active organizations are returned.
- Use the organization's `_id` (database ID) when you share a credential, not the `VDOC-ORG-…` code.

#### Share a Credential

Shares one credential with an organization for a stated purpose and a limited time.

**Endpoint:** `POST /credential-shares`
**Access:** Bearer token; active Citizen

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `credentialId` | string | Confirm | The VerifyDoc ID of the credential to share |
| `organizationId` | string | Confirm | The organization's database `_id` |
| `purpose` | string | Confirm | Why the credential is being shared |
| `expiresAt` | string | Confirm | When the permission expires, as an ISO UTC timestamp |

**Example request**

```json
{
  "credentialId": "VDOC-CRED-12345678",
  "organizationId": "507f1f77bcf86cd799439022",
  "purpose": "Employment verification",
  "expiresAt": "2026-10-20T12:00:00.000Z"
}
```

**Success response · 201**

```json
{
  "message": "Credential shared successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439044",
    "credential": "507f1f77bcf86cd799439066",
    "citizen": "507f1f77bcf86cd799439011",
    "organization": "507f1f77bcf86cd799439022",
    "purpose": "Employment verification",
    "expiresAt": "2026-10-20T12:00:00.000Z",
    "status": "Active"
  }
}
```

**Errors**

| Status | Message | Cause |
|---|---|---|
| 409 | Only active, verified credentials can be shared | The credential isn't active and verified |

**Notes**
- Send the organization's database `_id` as `organizationId`, not its business ID (such as `VDOC-ORG-NOV-1234`).
- Set `expiresAt` to a future UTC timestamp that ends in `Z` and is no more than 365 days ahead.
- The response returns database IDs for the credential, citizen, and organization.
- After a successful response, confirm the share in your UI and refresh the sharing status.

#### View Sharing History

Returns the credentials the logged-in citizen has shared with organizations.

**Endpoint:** `GET /credential-shares/mine`
**Access:** Bearer token; active Citizen

**Query parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `page` | number | Confirm | The page number |
| `limit` | number | Confirm | Results per page |

**Example request**

```http
GET /credential-shares/mine?page=1&limit=10
Authorization: Bearer <access_token>
```

**Success response · 200**

```json
{
  "message": "Credential sharing history retrieved successfully",
  "data": {
    "shares": [
      {
        "shareId": "507f1f77bcf86cd799439044",
        "credential": {
          "credentialId": "VDOC-CRED-12345678",
          "issuerName": "Example University",
          "credentialType": "Degree",
          "title": "B.Sc Chemistry",
          "issueDate": "2025-07-01T00:00:00.000Z",
          "verificationStatus": "Verified",
          "status": "Active"
        },
        "organization": {
          "id": "507f1f77bcf86cd799439022",
          "name": "NovaBridge Ltd"
        },
        "purpose": "Employment verification",
        "expiresAt": "2026-10-20T12:00:00.000Z",
        "status": "Active",
        "createdAt": "2026-10-12T12:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

**Errors**

| Status | Message | Cause |
|---|---|---|
| 403 | Citizen access required | The token doesn't belong to a citizen account |

**Notes**
- Show the shared credential, receiving organization, purpose, expiry date, and sharing status in your UI.

#### Revoke a Credential Share

Ends an organization's access to a credential that a citizen shared with it.

**Endpoint:** `PATCH /credential-shares/:shareId/revoke`
**Access:** Bearer token; the active Citizen who owns the share

**Path parameters**

| Parameter | Type | Description |
|---|---|---|
| `shareId` | string | The database ID of the share to revoke |

**Request body:** None.

**Example request**

```http
PATCH /credential-shares/507f1f77bcf86cd799439044/revoke
Authorization: Bearer <access_token>
```

**Success response · 200**

```json
{
  "message": "Credential share revoked successfully",
  "data": {
    "shareId": "507f1f77bcf86cd799439044",
    "status": "Revoked",
    "revokedAt": "2026-10-12T12:10:00.000Z"
  }
}
```

**Errors**

| Status | Message | Cause |
|---|---|---|
| 404 | Active share not found | The share doesn't exist, isn't yours, or is no longer active |

**Notes**
- Revocation can't be undone. To grant access again, create a new share.

#### View Credentials Shared With an Organization

Returns the credentials that citizens have shared with the logged-in organization.

**Endpoint:** `GET /credential-shares/organization`
**Access:** Bearer token; active, approved Organization member

**Query parameters**

| Parameter | Type | Description |
|---|---|---|
| `page` | integer | The page number |
| `limit` | integer | Results per page |

**Example request**

```http
GET /credential-shares/organization?page=1&limit=10
Authorization: Bearer <access_token>
```

**Success response · 200**

```json
{
  "message": "Shared credentials retrieved successfully",
  "data": {
    "shares": [
      {
        "shareId": "507f1f77bcf86cd799439044",
        "credential": {
          "credentialId": "VDOC-CRED-12345678",
          "issuerName": "Example University",
          "credentialType": "Degree",
          "title": "B.Sc Chemistry",
          "issueDate": "2025-07-01T00:00:00.000Z",
          "verificationStatus": "Verified",
          "status": "Active"
        },
        "organization": {
          "id": "507f1f77bcf86cd799439022",
          "name": "NovaBridge Ltd"
        },
        "purpose": "Employment verification",
        "expiresAt": "2026-10-20T12:00:00.000Z",
        "status": "Active",
        "createdAt": "2026-10-12T12:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "returned": 1
    }
  }
}
```

**Errors**

| Status | Message | Cause |
|---|---|---|
| 403 | Organization is not active | The organization is inactive and can't access this resource |

**Notes**
- Only active, unexpired shares with active, verified credentials are returned.
- The response doesn't include a private document URL.
- `pagination.returned` is the number of records in this response, **not** the total number of matching records.
- Keep `credential.verificationStatus` separate from `credential.status`. They are different fields.

#### View a Specific Shared Credential

Returns one credential that was shared with the logged-in organization.

**Endpoint:** `GET /credential-shares/organization/:shareId`
**Access:** Bearer token; active, approved Organization member in the recipient organization

**Path parameters**

| Parameter | Type | Description |
|---|---|---|
| `shareId` | string | The database ID of the share to retrieve |

**Example request**

```http
GET /credential-shares/organization/507f1f77bcf86cd799439044
Authorization: Bearer <access_token>
```

**Success response · 200**

```json
{
  "message": "Shared credential retrieved successfully",
  "data": {
    "shareId": "507f1f77bcf86cd799439044",
    "credential": {
      "credentialId": "VDOC-CRED-12345678",
      "issuerName": "Example University",
      "credentialType": "Degree",
      "title": "B.Sc Chemistry",
      "issueDate": "2025-07-01T00:00:00.000Z",
      "verificationStatus": "Verified",
      "status": "Active"
    },
    "organization": {
      "id": "507f1f77bcf86cd799439022",
      "name": "NovaBridge Ltd"
    },
    "purpose": "Employment verification",
    "expiresAt": "2026-10-20T12:00:00.000Z",
    "status": "Active",
    "createdAt": "2026-10-12T12:00:00.000Z"
  }
}
```

**Errors**

| Status | Message | Cause |
|---|---|---|
| 404 | Active share not found | The share isn't available or no longer exists |

**Notes**
- An organization can't access another organization's shares.
- The response doesn't include a private document URL.
- Use the authenticated organization's token and the correct `shareId`.

### 5.7 Fresh Confirmation

These endpoints let an employer ask the issuing institution to reconfirm a shared credential. Each request has one of these `status` values: `Pending`, `Confirmed`, or `Disputed`. Institution-side endpoints are summarized in Section 5.9.

#### Request Fresh Confirmation

Asks the issuing institution to confirm a shared credential's current details.

**Endpoint:** `POST /credential-shares/organization/:shareId/confirmations`
**Access:** Bearer token; active, approved Organization member in the recipient organization

**Path parameters**

| Parameter | Type | Description |
|---|---|---|
| `shareId` | string | The database ID of the share |

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `reason` | string | Confirm | Why the organization is requesting fresh confirmation |

**Example request**

```http
POST /credential-shares/organization/507f1f77bcf86cd799439044/confirmations
Authorization: Bearer <access_token>
Content-Type: application/json
```

```json
{
  "reason": "Confirm current graduation status"
}
```

**Success response · 201**

```json
{
  "message": "Fresh confirmation requested",
  "data": {
    "id": "507f1f77bcf86cd799439055",
    "shareId": "507f1f77bcf86cd799439044",
    "credentialId": "507f1f77bcf86cd799439066",
    "organizationId": "507f1f77bcf86cd799439022",
    "institutionId": "507f1f77bcf86cd799439033",
    "reason": "Confirm current graduation status",
    "status": "Pending",
    "createdAt": "2026-10-12T12:00:00.000Z"
  }
}
```

**Errors**

| Status | Message | Cause |
|---|---|---|
| 409 | A confirmation request is already pending for this share | A request already exists and is awaiting a response |

**Notes**
- A request needs an active, unexpired share, an active verified credential, and an active registered issuing institution.
- Only one `Pending` request is allowed per share at a time.

#### View an Organization's Confirmation Requests

Returns the logged-in organization's fresh confirmation requests. You can filter by status.

**Endpoint:** `GET /credential-confirmations/organization`
**Access:** Bearer token; active, approved Organization member

**Query parameters**

| Parameter | Type | Description |
|---|---|---|
| `status` | string | Optional filter: `Pending`, `Confirmed`, or `Disputed` |
| `page` | integer | The page number |
| `limit` | integer | Results per page; maximum 50 |

**Example request**

```http
GET /credential-confirmations/organization?status=Pending&page=1&limit=10
Authorization: Bearer <access_token>
```

**Success response · 200**

```json
{
  "message": "Organization confirmation requests retrieved",
  "data": {
    "requests": [
      {
        "id": "507f1f77bcf86cd799439055",
        "shareId": "507f1f77bcf86cd799439044",
        "credentialId": "507f1f77bcf86cd799439066",
        "organizationId": "507f1f77bcf86cd799439022",
        "institutionId": "507f1f77bcf86cd799439033",
        "reason": "Confirm current graduation status",
        "status": "Pending",
        "createdAt": "2026-10-12T12:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

**Errors**

| Status | Message | Cause |
|---|---|---|
| 403 | Organization is not active | The organization is inactive and can't access this resource |

**Notes**
- The `status` filter is optional.
- Use the returned pagination fields to build or update pagination controls.

### 5.8 Health Check

The health check confirms the server is running. See Section 2.1 for details.

### 5.9 Additional Endpoints

These endpoints exist in the API but don't have full entries yet. Each is listed with its purpose and access requirement.

| Group | Method | Path | Purpose | Access |
|---|---|---|---|---|
| 5.1 Users | PATCH | `/users/me` | Updates the signed-in user's profile | Bearer token |
| 5.2 Onboarding | POST | `/auth/register-organization` | Registers an employer organization | Public |
| 5.2 Onboarding | POST | `/auth/register-institution` | Registers an institution | Public |
| 5.3 Admin | GET | `/admin/dashboard` | Shows the admin dashboard summary | Admin |
| 5.3 Admin | GET | `/admin/approval-queue` | Lists onboarding requests in the approval queue | Admin |
| 5.3 Admin | GET | `/admin/organizations/pending` | Lists employer organizations awaiting approval | Admin |
| 5.3 Admin | PATCH | `/admin/organizations/:organizationId/approve` | Approves an employer organization | Admin |
| 5.3 Admin | PATCH | `/admin/organizations/:organizationId/reject` | Rejects an employer organization | Admin |
| 5.3 Admin | GET | `/admin/institutions/pending` | Lists institutions awaiting approval | Admin |
| 5.3 Admin | PATCH | `/admin/institutions/:institutionId/approve` | Approves an institution | Admin |
| 5.3 Admin | PATCH | `/admin/institutions/:institutionId/reject` | Rejects an institution | Admin |
| 5.3 Admin | GET | `/admin/users` | Lists platform users | Admin |
| 5.4 Credentials | GET | `/credentials/institution` | Lists credentials an institution has issued or must review | Approved Institution |
| 5.4 Credentials | PATCH | `/credentials/:credentialId/reject` | Rejects a citizen-uploaded credential | Approved issuing Institution |
| 5.5 QR | GET | `/credentials/:credentialId/qr` | Generates a credential's QR code and verification link | Credential owner or issuing Institution |
| 5.5 QR | GET | `/credentials/verify/:credentialId?token=` | Checks a credential publicly with a signed token | Public (rate limited) |
| 5.7 Confirmation | GET | `/credential-confirmations/institution` | Lists confirmation requests for an institution | Approved Institution |
| 5.7 Confirmation | PATCH | `/credential-confirmations/institution/:requestId/respond` | Responds `Confirmed` or `Disputed` to a request | Approved Institution |
| 5.8 Health | GET | `/` | Confirms the server is running | Public |

## 6. Common Workflows

The endpoint reference in Section 5 describes each request on its own. These workflows show how the requests fit together in real use. Each one lists the steps in order, with the actor in parentheses.

### 6.1 Register and Sign In as a Citizen

Use this sequence to create a citizen account and start making authorized requests.

1. Send `POST /auth/register` with the citizen's details. (Citizen)
2. Read the verification code sent to the citizen's email.
3. Send `POST /auth/email/verify` with the email and the code. (Citizen)
4. Send `POST /auth/login` and store the returned token. (Citizen)
5. Send `GET /auth/me` with the token to confirm it works. (Citizen)

**Notes**
- See Sections 3.2 to 3.5 for the full request and response details.

### 6.2 Upload a Credential and Get It Verified

Use this sequence when a citizen uploads a credential and the issuing institution reviews it.

1. Send `POST /credentials` as `multipart/form-data` with the PDF, the credential details, and `issuerName`. (Citizen)
2. Save the `credentialId` from the response. The credential starts with `verificationStatus: Pending`. (Citizen)
3. Send `GET /credentials/institution?view=pendingReview` to list credentials awaiting review. (Institution)
4. Send `GET /credentials/:credentialId` to review the credential and its document. (Institution)
5. Send `PATCH /credentials/:credentialId/verify` to confirm it, or `PATCH /credentials/:credentialId/reject` to decline it. (Institution)
6. Send `GET /credentials/wallet` to see the updated `verificationStatus`. (Citizen)

**Notes**
- Only citizen-uploaded credentials in `Pending` status can be verified. A second attempt returns `409`.

### 6.3 Issue a Credential to a Citizen

Use this sequence when an approved institution issues a credential directly.

1. Log in with an approved institution account. (Institution)
2. Send `POST /credentials` as `multipart/form-data` with the PDF, the credential details, and the citizen's database ID as `citizenId`. (Institution)
3. Send `GET /credentials/wallet` to see the new credential in the wallet. (Citizen)

**Notes**
- Don't send `issuerName` or `institution`. The backend determines the issuer.
- Credentials can't be edited. To correct a mistake, send `PATCH /credentials/:credentialId/revoke` with a `revocationReason`, then issue a new credential. Revocation works only on active, verified credentials.

### 6.4 Share a Credential With an Employer

Use this sequence when a citizen shares one credential with an approved employer, and the employer views it.

1. Send `GET /credential-shares/eligible-organizations` to list the employers available. (Citizen)
2. Copy the `_id` of the chosen organization. Use this database ID, not the `VDOC-ORG-…` code. (Citizen)
3. Send `POST /credential-shares` with the credential, organization, purpose, and expiry. (Citizen)
4. Send `GET /credential-shares/mine` to track the share's status. (Citizen)
5. Send `GET /credential-shares/organization` to list credentials shared with the employer. (Employer)
6. Send `GET /credential-shares/organization/:shareId` to view one shared credential. (Employer)

**Example share request**

```json
{
  "credentialId": "VDOC-CRED-12345678",
  "organizationId": "507f1f77bcf86cd799439022",
  "purpose": "Employment verification",
  "expiresAt": "2026-10-20T12:00:00.000Z"
}
```

**Notes**
- `expiresAt` must be a future UTC timestamp ending in `Z`, no more than 365 days ahead.
- Only active, verified credentials can be shared. Anything else returns `409`.
- To end access early, send `PATCH /credential-shares/:shareId/revoke`. Revocation can't be undone.
- Employers see only active, unexpired shares. Responses leave out the private document link.

### 6.5 Request Fresh Confirmation

Use this sequence when an employer asks the issuing institution to reconfirm a shared credential.

1. Send `POST /credential-shares/organization/:shareId/confirmations` with a `reason`. (Employer)
2. Send `GET /credential-confirmations/institution?status=Pending` to list requests awaiting a response. (Institution)
3. Send `PATCH /credential-confirmations/institution/:requestId/respond` with a `decision` of `Confirmed` or `Disputed`. (Institution)
4. Send `GET /credential-confirmations/organization` to read the result. (Employer)

**Example institution response**

```json
{
  "decision": "Confirmed",
  "responseNote": "Credential details remain accurate"
}
```

**Notes**
- A request needs an active, unexpired share, an active verified credential, and an active registered issuing institution.
- Each share can have only one `Pending` request at a time. A second request returns `409`.
- A `Disputed` decision requires a `responseNote` of 3 to 1,000 characters.
- Responding does not change the credential itself.

### 6.6 Verify a Credential With a QR Code

Use this sequence to generate a QR code for a credential and check it publicly.

1. Send `GET /credentials/:credentialId/qr` to get the verification link and QR image. (Citizen or issuing Institution)
2. Display `qrCodeDataUrl` as an image. (Client app)
3. Scan the code. The link opens the frontend verification page, with the credential ID and a signed token in the URL. (Verifier)
4. Send `GET /credentials/verify/:credentialId?token=<token>`. The frontend page makes this call. (Client app)
5. Read `isValid` in the response. (Client app)

**Notes**
- The public API returns `isValid: false` for revoked or unverified credentials when the token is valid.
- An invalid token returns `403` with "Invalid verification token".
- The public endpoint is limited to 30 requests per minute per IP address.



## 7. Known Limitations

These are the known gaps in the current implementation, based on the backend review of 12 October 2026. They are backend follow-ups, not client responsibilities. Check with the backend team before relying on any affected feature in production.

| Area | Limitation | Impact |
|---|---|---|
| Institution registration | `POST /auth/register-institution` doesn't assign the Institution role before creating the user. As implemented, it is likely to fail with `400 Invalid role` and roll back. | Institutions can't register until this is fixed |
| Institution verification email | Once the role issue is fixed, the controller also references an undefined variable when sending the verification code. The error is caught, so the email may not send. | An institution may not receive its verification code |
| Profile pictures | `PATCH /users/me` references a cleanup function that isn't imported. | Replacing a profile picture may not clear the old image |
| Sessions | Access tokens last 1 day. There is no refresh-token mechanism, rotation, or forced revocation. | Users log in again when the token expires |
| Rate limiting | Only the public verification endpoint is limited. Rate limiting on authentication endpoints is planned. | Login and reset endpoints have no request cap yet |
| Employer share list | `GET /credential-shares/organization` reports `returned` instead of `total` and `totalPages`. | Clients can't compute the total number of pages |
| Account deletion | No endpoint exists to delete an account. | Users can't remove their account through the API |
| Confirmation visibility | No endpoint exposes fresh-confirmation requests to citizens. | Citizens can't see requests through the API |
| Deployment | No production base URL is established, and the Cloudinary document-storage integration and production cross-origin (CORS) rules aren't finalized. | Production setup needs backend confirmation |

> This documentation describes current implemented behavior, not an independently tested public API contract.



## 8. Getting Help

If you can't find what you need in this documentation, contact [Koto Temiloluwa John](https://github.com/John-2TB) .


Before you reach out, try these checks:

1. Read the status code and message, and compare them with the error table in Section 4.5.
2. Confirm the access token hasn't expired. Tokens last 1 day.
3. Confirm you're sending the right ID type for the endpoint (Section 4.2).
4. Confirm the account's role matches the endpoint's access requirements.

When you report a problem, include:

- The endpoint and method
- The request body, with passwords and tokens removed
- The response status code and message
- The time of the request

