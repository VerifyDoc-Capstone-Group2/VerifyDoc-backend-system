# VerifyDoc — Credential Management & QR Verification API

**Version:** 1.0 · **Updated:** 8 October 2026 · **Branch:** main

> This reference covers the credential API implemented in Express. Credential route and QR-verification GitHub Actions tests passed using mocked dependencies. Full MongoDB/Cloudinary integration testing is still required.

## Base URL and authentication

Replace `{API_BASE_URL}` with the deployed backend URL. Protected endpoints require:

```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

Roles are `Citizen`, `Institution`, `Organization`, and `Admin`. The private credential APIs are for Citizens and Institutions; public QR verification is available without login. Account and Institution membership must be active.

### Endpoints at a glance

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/credentials` | Citizen, Institution | Upload/issue a credential |
| GET | `/credentials/wallet` | Citizen | Paginated wallet |
| GET | `/credentials/institution` | Institution | Paginated issuer dashboard |
| GET | `/credentials/:credentialId` | Owner or associated Institution | Private credential detail |
| PATCH | `/credentials/:credentialId/verify` | Associated Institution | Approve pending Citizen upload |
| PATCH | `/credentials/:credentialId/reject` | Associated Institution | Reject pending Citizen upload |
| PATCH | `/credentials/:credentialId/revoke` | Associated Institution | Revoke verified credential |
| GET | `/credentials/:credentialId/qr` | Owner or associated Institution | Signed QR URL and PNG data URL |
| GET | `/credentials/verify/:credentialId?token=...` | Public | Privacy-limited verification |

## 1. Create credential

`POST /credentials` — `multipart/form-data`; **PDF only**, maximum **5 MB**. File field must be exactly `document`. Authentication required.

| Form field | Required | Notes |
|---|---|---|
| `document` | Yes | PDF file |
| `credentialType` | Yes | Non-empty text |
| `title` | Yes | Non-empty text |
| `issueDate` | Yes | ISO date; not future |
| `fieldOfStudy` | No | Non-empty when supplied |
| `graduationYear` | No | Integer 1900 through current year |
| `citizenId` | Institution only | MongoDB ObjectId of Citizen |
| `institution` | Citizen optional | Registered Institution MongoDB ObjectId |
| `issuerName` | Citizen if no institution | Free-text issuer for unregistered institution |

Institution users must **not** supply `institution` or `issuerName`; the backend determines the issuer from their membership. Citizen users cannot supply `citizenId`; the backend uses their own identity. When Citizen supplies `institution`, omit `issuerName`.

Example using curl:

```bash
curl -X POST "{API_BASE_URL}/credentials" \
  -H "Authorization: Bearer {TOKEN}" \
  -F "document=@certificate.pdf;type=application/pdf" \
  -F "title=BSc Chemistry" \
  -F "credentialType=Degree" \
  -F "issueDate=2025-08-15" \
  -F "graduationYear=2025" \
  -F "issuerName=Example University"
```

**201 Created**

```json
{
  "message": "Credential created successfully",
  "data": {
    "credentialId": "VDOC-CRED-12345678",
    "title": "BSc Chemistry",
    "source": "Citizen",
    "verificationStatus": "Pending",
    "status": "Active"
  }
}
```

The response includes additional saved model fields. Institution-issued credentials are initially `Verified`; Citizen-uploaded credentials are initially `Pending`. The backend uploads the PDF to Cloudinary and attempts to delete it if credential creation fails.

## 2. Citizen wallet

`GET /credentials/wallet` — Citizen only.

Optional query parameters:

| Parameter | Allowed values | Default |
|---|---|---|
| `page` | Positive integer | 1 |
| `limit` | 1–50 | 10 |
| `verificationStatus` | Pending, Verified, Rejected | All |
| `status` | Active, Revoked | All |
| `source` | Citizen, Institution | All |

Example: `GET /credentials/wallet?page=1&limit=10&verificationStatus=Verified`

**200 OK**

```json
{
  "message": "Citizen credentials retrieved successfully",
  "data": {
    "credentials": [
      {
        "credentialId": "VDOC-CRED-12345678",
        "issuerName": "Example University",
        "credentialType": "Degree",
        "title": "BSc Chemistry",
        "source": "Institution",
        "verificationStatus": "Verified",
        "status": "Active"
      }
    ],
    "pagination": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
  }
}
```

Wallet summaries intentionally omit document URLs. Fetch the private detail endpoint when the owner needs full details.

## 3. Institution dashboard

`GET /credentials/institution` — Institution only.

Query parameters: `page` (default 1), `limit` (default 10, maximum 50), `view` (`all`, `issued`, `uploaded`, `pendingReview`), `verificationStatus` (`Pending`, `Verified`, `Rejected`), `status` (`Active`, `Revoked`).

`pendingReview` restricts results to active, pending Citizen uploads; conflicting status filters produce a 400 response.

Example: `GET /credentials/institution?view=pendingReview&page=1`

Response shape: `{ "message": "Institution credentials retrieved successfully", "data": { "credentials": [...], "pagination": { "page": 1, "limit": 10, "total": 0, "totalPages": 0 } } }`.

## 4. Private credential detail

`GET /credentials/:credentialId` — owner Citizen or associated active Institution only.

Credential ID format: `VDOC-CRED-` followed by exactly 8 digits. Returns the saved credential document, including the Cloudinary document reference. **Never use this endpoint as the public QR verification API.**

## 5. Approve a pending credential

`PATCH /credentials/:credentialId/verify` — associated active Institution only. No request body required.

Only credentials with `source: "Citizen"`, `verificationStatus: "Pending"`, and `status: "Active"` are eligible. Successful approval atomically sets `verificationStatus: "Verified"`, `verifiedAt`, and `verifiedByInstitutionUserId`.

**200 OK:** `{ "message": "Credential verified successfully", "data": { ... } }`.

Repeated or conflicting review attempts return **409 Conflict**.

## 6. Reject a pending credential

`PATCH /credentials/:credentialId/reject` — associated active Institution only.

```json
{ "rejectionReason": "The supplied document does not match our records." }
```

`rejectionReason` is required, non-empty, and at most 1,000 characters. Eligibility matches approval (pending, active, Citizen-uploaded).

**200 OK:** `{ "message": "Credential rejected successfully", "data": { ... } }`.

## 7. Revoke a verified credential

`PATCH /credentials/:credentialId/revoke` — associated active Institution only.

```json
{ "revocationReason": "Credential issued in error." }
```

`revocationReason` is required, non-empty, and at most 1,000 characters. Only `Active` and `Verified` credentials can be revoked. The backend atomically sets `status: "Revoked"`, `revokedAt`, and `revocationReason`. The original verification status remains `Verified`; a revoked credential is **not valid** for public verification.

**200 OK:** `{ "message": "Credential revoked successfully", "data": { ... } }`.

## 8. Generate credential QR code

`GET /credentials/:credentialId/qr` — authenticated owner Citizen or associated active Institution.

**200 OK:**

```json
{
  "message": "QR code generated",
  "data": {
    "credentialId": "VDOC-CRED-12345678",
    "verificationUrl": "https://verifydoc-capstone-group2.github.io/verify/VDOC-CRED-12345678?token=<SIGNED_TOKEN>",
    "qrCodeDataUrl": "data:image/png;base64,<PNG_BASE64>"
  }
}
```

The URL is signed with HMAC-SHA256 using `QR_VERIFICATION_SECRET`. The PNG is a data URL suitable for an `img` source. The frontend must implement the `/verify/:credentialId` route and pass its token to the public backend endpoint. Confirm the correct GitHub Pages path if the frontend is hosted under a repository subdirectory.

## 9. Public QR verification

`GET /credentials/verify/:credentialId?token=<SIGNED_TOKEN>` — **no authentication required**.

A valid token proves the URL was generated using the configured signing secret; it does **not** guarantee the credential is currently valid. The backend checks its live state.

**200 OK:** `{ "message": "Credential verification result", "data": { "credentialId": "VDOC-CRED-12345678", "issuerName": "Example University", "title": "BSc Chemistry", "verificationStatus": "Verified", "status": "Active", "isValid": true } }`.

`isValid` is true **only** if `status === "Active"` and `verificationStatus === "Verified"`. Pending, rejected, or revoked credentials return `isValid: false`. Public responses intentionally exclude Citizen identity and private document URLs.

Invalid signed tokens are rejected. The public endpoint has an in-memory limit of 30 requests/minute per IP; a shared limiter is recommended for multiple production instances.

## HTTP statuses and error handling

| Status | Meaning |
|---|---|
| 200 | Successful read/update |
| 201 | Credential created |
| 400 | Invalid field, ID, date, query, or missing file |
| 401 | Missing/invalid authentication |
| 403 | Not permitted, inactive account, invalid verification token |
| 404 | Credential, user, or Institution not found |
| 409 | Already reviewed/revoked, or duplicate |
| 429 | Public verification rate limit exceeded |
| 500 | Unexpected server or upload error |

Most errors use `{ "message": "Human-readable error" }`. Frontend code should read `message` and handle non-2xx responses explicitly.

## Security and deployment

Environment variables needed for this feature include:

```env
MONGODB_URI=<private MongoDB connection string>
JWT_SECRET=<private JWT signing secret>
FRONTEND_URL=https://verifydoc-capstone-group2.github.io
QR_VERIFICATION_SECRET=<random secret at least 32 characters>
```

Cloudinary credentials are also required for PDF uploads. Keep all secrets in Render environment settings and GitHub Actions Secrets, never in committed files. Use a dedicated test database (`VerifyDoc_test`) for integration tests.

Production considerations: restrict CORS to trusted origins, verify Cloudinary access policies for private documents, use distributed rate limiting, validate PDF content beyond the MIME label, and add real database/upload integration tests.

## Testing status

- **QR verification GitHub Actions:** passed.
- **Credential API routes GitHub Actions:** passed.
- The credential route tests use mocked services, authentication, and Cloudinary.
- End-to-end testing against real MongoDB, real authorization, and Cloudinary is **not yet complete**.

Repository: https://github.com/VerifyDoc-Capstone-Group2/VerifyDoc-backend-system

This document is an integration reference for the current MVP implementation, not a claim that every endpoint has been production-tested.
