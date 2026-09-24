# VerifyDoc Backend API

VerifyDoc is a private, role-based digital credential verification platform for universities, polytechnics, bootcamps, employers, and citizens.

This backend powers the VerifyDoc MVP.

## Core MVP Idea

- Approved institutions issue and manage official credentials.
- Citizens view their credentials in a private digital wallet.
- Citizens share one credential at a time with approved employer organizations.
- Employers can request fresh confirmation from the issuing institution.
- Institutions approve, reject, or flag verification requests for manual review.
- Admin approves employer organizations and institutions before they can access sensitive features.
- QR codes help identify credentials, but QR codes do not bypass login or permission checks.

---

## MVP Scope

### Included

- JWT authentication
- Role-based access control
- Forgot-password OTP flow
- Admin approval for employer organizations
- Admin approval for institutions
- Institution-issued credentials
- Citizen wallet
- Credential claim flow
- Credential sharing through access grants
- Employer access to shared credentials
- Fresh verification requests
- Institution response to verification requests
- Citizen legacy document submission
- QR token and QR code generation
- MongoDB database with Mongoose

### Not Included

- Public credential verification
- Public QR verification
- Public share links
- Search for citizens by name, email, username, or phone number
- Audit logs
- Notifications
- Fraud detection
- OCR or AI document-tampering detection
- NIMC, NYSC, WAEC, NECO, CAC, or university live API integrations
- Payment/subscription system
- Native mobile backend-specific features

---

## Tech Stack

- Node.js
- Express.js
- MongoDB
- Mongoose
- JSON Web Token (JWT)
- bcrypt
- Cloudinary (optional, for document uploads)
- Resend or Nodemailer (optional, for password-reset OTP email)
- QR Code library

---

## Architecture

```text
Client Application
        |
        | HTTPS REST API + JWT
        v
Routes
        |
        v
Middleware
        |
        v
Controllers
        |
        v
Services
        |
        v
Mongoose Models
        |
        v
MongoDB
```

### Architecture Rule

```text
Routes -> Middleware -> Controllers -> Services -> Models -> MongoDB
```

### Layer Responsibilities

| Layer | Responsibility |
|---|---|
| Routes | Maps endpoints to middleware and controllers |
| Middleware | Handles JWT authentication, roles, approval status, ownership, access grants, validation, and errors |
| Controllers | Reads request input, calls services, and sends API responses |
| Services | Contains business logic and database workflows |
| Models | Defines MongoDB schemas, validation, relationships, and indexes |
| Utils | Handles reusable helpers such as Credential ID generation, QR token generation, and OTP hashing |

---

## Project Structure

```text
src/
├── config/
│   ├── db.js
│   ├── env.js
│   └── cloudinary.js
│
├── models/
│   ├── User.js
│   ├── Organization.js
│   ├── Institution.js
│   ├── Credential.js
│   ├── CredentialSubmission.js
│   ├── AccessGrant.js
│   ├── VerificationRequest.js
│   └── PasswordResetOtp.js
│
├── services/
│   ├── authService.js
│   ├── adminService.js
│   ├── organizationService.js
│   ├── institutionService.js
│   ├── credentialService.js
│   ├── credentialSubmissionService.js
│   ├── accessGrantService.js
│   ├── verificationRequestService.js
│   └── qrService.js
│
├── controllers/
│   ├── authController.js
│   ├── adminController.js
│   ├── organizationController.js
│   ├── institutionController.js
│   ├── credentialController.js
│   ├── credentialSubmissionController.js
│   ├── accessGrantController.js
│   ├── verificationRequestController.js
│   └── qrController.js
│
├── routes/
│   ├── authRoutes.js
│   ├── adminRoutes.js
│   ├── organizationRoutes.js
│   ├── institutionRoutes.js
│   ├── credentialRoutes.js
│   ├── credentialSubmissionRoutes.js
│   ├── accessGrantRoutes.js
│   ├── verificationRequestRoutes.js
│   └── qrRoutes.js
│
├── middleware/
│   ├── authenticateJWT.js
│   ├── requireRole.js
│   ├── requireActiveOrganization.js
│   ├── requireActiveInstitution.js
│   ├── requireCredentialOwner.js
│   ├── requireInstitutionOwnership.js
│   ├── requireAccessGrant.js
│   ├── validateRequest.js
│   ├── uploadFile.js
│   └── errorHandler.js
│
├── utils/
│   ├── generateCredentialId.js
│   ├── generateQrToken.js
│   ├── generateOtp.js
│   ├── hashOtp.js
│   └── apiError.js
│
├── app.js
└── server.js
```

---

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd verifydoc-backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create environment file

Create a `.env` file in the project root.

```env
PORT=5000
NODE_ENV=development

MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/verifydoc_db

JWT_SECRET=replace_with_a_long_secure_random_secret
JWT_EXPIRES_IN=1d

BCRYPT_SALT_ROUNDS=12

# Optional: Cloudinary for document uploads
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Optional: Email service for password reset OTP
RESEND_API_KEY=
EMAIL_FROM=VerifyDoc <no-reply@verifydoc.demo>
```

### 4. Run the development server

```bash
npm run dev
```

The server should run on:

```text
http://localhost:5000
```

---

## Scripts

```json
{
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "seed": "node src/seeds/seed.js",
    "test": "jest"
  }
}
```

---

## API Base URL

```text
/api/v1
```

Example:

```text
http://localhost:5000/api/v1/auth/login
```

---

# Roles

```text
CITIZEN
ORGANIZATION
INSTITUTION
ADMIN
```

## Role Summary

| Role | Main responsibility |
|---|---|
| Citizen | Views own credentials, claims credentials, shares selected credentials with approved employers |
| Organization | Receives shared credentials and requests fresh institutional confirmation |
| Institution | Issues official credentials and responds to verification requests |
| Admin | Approves/rejects employer organizations and institutions |

---

# Status Values

## User Account Status

```text
ACTIVE
PENDING_APPROVAL
REJECTED
SUSPENDED
```

## Organization Status

```text
PENDING_APPROVAL
ACTIVE
REJECTED
SUSPENDED
DEMO
```

## Institution Status

```text
PENDING_APPROVAL
ACTIVE
REJECTED
SUSPENDED
INACTIVE
DEMO
```

## Official Credential Status

```text
VERIFIED
REVOKED
EXPIRED
```

## Citizen Document Submission Status

```text
PENDING_VERIFICATION
VERIFIED
REJECTED
REQUIRES_MANUAL_REVIEW
```

## Verification Request Status

```text
PENDING
VERIFIED
REJECTED
REQUIRES_MANUAL_REVIEW
CANCELLED
```

## Access Grant Status

```text
ACTIVE
REVOKED
EXPIRED
```

## Credential Source Type

```text
INSTITUTION_ISSUED
INSTITUTION_IMPORTED
```

---

# Core Business Rules

1. Only `ACTIVE` Admin-approved institutions can create, update, confirm, reject, revoke, or manage official credentials.

2. Only `ACTIVE` Admin-approved employer organizations can receive shared credentials or create fresh verification requests.

3. Citizens can view only their own wallet and credentials linked to their account.

4. Citizens cannot search for other citizens.

5. Employers cannot search for citizens by name, email, phone number, or username.

6. Employers can view a credential only when the citizen has created an active, unexpired access grant for that employer organization.

7. A citizen-uploaded PDF/image is not an official credential.

8. Citizen-uploaded legacy documents are stored as `credentialSubmissions`.

9. Official institution-issued records are stored in the `credentials` collection.

10. A QR code identifies a credential but does not grant permission by itself.

11. A revoked or expired credential must never appear as verified.

12. Admin users cannot be created through public registration.

13. There are no public verification routes in the MVP.

14. Audit logs and notifications are deferred to a future version.

---

# MongoDB Collections

```text
users
organizations
institutions
credentials
credentialSubmissions
accessGrants
verificationRequests
passwordResetOtps
```

---

# Database Models

## User Model

```js
{
  firstName: String,
  lastName: String,
  email: String,
  passwordHash: String,
  phoneNumber: String,

  role: "CITIZEN" | "ORGANIZATION" | "INSTITUTION" | "ADMIN",

  accountStatus:
    "ACTIVE" |
    "PENDING_APPROVAL" |
    "REJECTED" |
    "SUSPENDED",

  organizationId: ObjectId | null,
  institutionId: ObjectId | null,

  isEmailVerified: Boolean,

  createdAt: Date,
  updatedAt: Date
}
```

### User Rules

```text
CITIZEN:
- organizationId must be null
- institutionId must be null

ORGANIZATION:
- organizationId is required

INSTITUTION:
- institutionId is required

ADMIN:
- cannot be created through public registration
```

### User Indexes

```js
email: unique
role: index
accountStatus: index
organizationId: index
institutionId: index
```

---

## Organization Model

```js
{
  name: String,

  organizationType:
    "EMPLOYER" |
    "RECRUITMENT_AGENCY" |
    "HR_FIRM" |
    "BANK" |
    "FINTECH" |
    "OTHER",

  cacNumber: String,
  cacCertificateUrl: String | null,

  officialEmail: String,
  phoneNumber: String,
  address: String,
  website: String | null,

  contactPersonName: String,
  contactPersonRole: String,

  purposeOfUse: String,

  status:
    "PENDING_APPROVAL" |
    "ACTIVE" |
    "REJECTED" |
    "SUSPENDED" |
    "DEMO",

  approvedByAdminId: ObjectId | null,
  approvedAt: Date | null,
  rejectionReason: String | null,

  createdAt: Date,
  updatedAt: Date
}
```

---

## Institution Model

```js
{
  name: String,

  institutionType:
    "UNIVERSITY" |
    "POLYTECHNIC" |
    "BOOTCAMP" |
    "TRAINING_ACADEMY",

  officialEmail: String,
  phoneNumber: String,
  address: String,
  website: String | null,

  contactPersonName: String,

  contactPersonRole:
    "REGISTRAR" |
    "RECORDS_OFFICER" |
    "ICT_ADMIN" |
    "OPERATIONS_LEAD" |
    "FOUNDER",

  cacNumber: String | null,
  supportingDocumentUrl: String | null,

  credentialTypesIssued: [String],

  status:
    "PENDING_APPROVAL" |
    "ACTIVE" |
    "REJECTED" |
    "SUSPENDED" |
    "INACTIVE" |
    "DEMO",

  verificationMethod: "VERIFYDOC_PORTAL",

  approvedByAdminId: ObjectId | null,
  approvedAt: Date | null,
  rejectionReason: String | null,

  createdAt: Date,
  updatedAt: Date
}
```

---

## Credential Model

The `credentials` collection contains official records created or imported by an approved institution.

```js
{
  credentialId: String,
  credentialNumber: String,

  institutionId: ObjectId,

  holderUserId: ObjectId | null,
  holderName: String,
  holderEmail: String,
  holderStudentId: String | null,

  credentialType: String,
  programme: String,

  issueDate: Date,
  expiryDate: Date | null,

  status:
    "VERIFIED" |
    "REVOKED" |
    "EXPIRED",

  sourceType:
    "INSTITUTION_ISSUED" |
    "INSTITUTION_IMPORTED",

  certificateFileUrl: String | null,

  qrToken: String,

  createdByUserId: ObjectId,

  verifiedAt: Date | null,
  revokedAt: Date | null,
  revokedReason: String | null,

  createdAt: Date,
  updatedAt: Date
}
```

### Credential ID vs Credential Number

| Field | Created by | Example | Purpose |
|---|---|---|---|
| `credentialId` | VerifyDoc | `VDOC-LTSA-2026-00021` | Unique VerifyDoc identifier used for QR, internal lookup, sharing, and access grants |
| `credentialNumber` | Institution | `LTSA-PM-001` | Original institution certificate/reference number used for comparing records |

### Credential Indexes

```js
credentialId: unique
qrToken: unique
institutionId: index
holderUserId: index
holderEmail: index
status: index

{ institutionId, credentialNumber }: unique compound index
```

---

## Credential Submission Model

The `credentialSubmissions` collection contains legacy certificates uploaded by a citizen for institution review.

```js
{
  citizenId: ObjectId,

  targetInstitutionId: ObjectId,

  uploadedFileUrl: String,

  submittedHolderName: String,
  submittedStudentId: String | null,

  submittedCredentialNumber: String,
  submittedCredentialType: String,
  submittedProgramme: String | null,
  submittedIssueDate: Date | null,

  status:
    "PENDING_VERIFICATION" |
    "VERIFIED" |
    "REJECTED" |
    "REQUIRES_MANUAL_REVIEW",

  matchedCredentialId: ObjectId | null,

  institutionResponse: {
    decision:
      "VERIFIED" |
      "REJECTED" |
      "REQUIRES_MANUAL_REVIEW" |
      null,

    comment: String | null,
    respondedByUserId: ObjectId | null,
    respondedAt: Date | null
  },

  createdAt: Date,
  updatedAt: Date
}
```

### Submission Comparison Logic

```text
Citizen uploads legacy certificate
        ↓
Citizen selects active issuing institution
        ↓
Submission saved as PENDING_VERIFICATION
        ↓
Institution checks official credentials collection
        ↓
Compare:
- institutionId
- credentialNumber
- holder name
- student/learner ID
- credential type
- programme
- issue date
        ↓
Institution confirms or rejects
        ↓
Submission links to matched official credential through matchedCredentialId
```

---

## Access Grant Model

The `accessGrants` collection controls employer permission to view one specific credential.

```js
{
  credentialId: ObjectId,
  citizenId: ObjectId,
  organizationId: ObjectId,

  purpose:
    "EMPLOYMENT_VERIFICATION" |
    "BACKGROUND_CHECK" |
    "OTHER",

  status:
    "ACTIVE" |
    "REVOKED" |
    "EXPIRED",

  grantedAt: Date,
  expiresAt: Date,
  revokedAt: Date | null,

  createdAt: Date,
  updatedAt: Date
}
```

### Access Grant Indexes

```js
credentialId: index
citizenId: index
organizationId: index
status: index
expiresAt: index

{ credentialId, organizationId }: unique compound index
```

---

## Verification Request Model

The `verificationRequests` collection stores an employer’s request for fresh confirmation of a credential already shared with that organization.

```js
{
  credentialId: ObjectId,
  institutionId: ObjectId,

  requestedByUserId: ObjectId,
  requesterOrganizationId: ObjectId,

  purpose: "EMPLOYMENT_VERIFICATION",

  message: String | null,

  status:
    "PENDING" |
    "VERIFIED" |
    "REJECTED" |
    "REQUIRES_MANUAL_REVIEW" |
    "CANCELLED",

  response: {
    decision:
      "VERIFIED" |
      "REJECTED" |
      "REQUIRES_MANUAL_REVIEW" |
      null,

    comment: String | null,
    respondedByUserId: ObjectId | null,
    respondedAt: Date | null
  },

  createdAt: Date,
  updatedAt: Date
}
```

---

## Password Reset OTP Model

```js
{
  userId: ObjectId,
  email: String,

  otpHash: String,

  expiresAt: Date,
  usedAt: Date | null,

  createdAt: Date
}
```

### OTP Rules

```text
- OTP expires after 10 to 15 minutes.
- OTP must be stored as a hash.
- OTP can be used once only.
- After successful password change, mark OTP as used.
- Delete expired OTP automatically with a MongoDB TTL index.
```

### TTL Index

```js
db.passwordResetOtps.createIndex(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);
```

---

# Middleware

## Required Middleware

| Middleware | Purpose |
|---|---|
| `authenticateJWT` | Validates JWT and attaches user to `req.user` |
| `requireRole(...roles)` | Restricts route to allowed roles |
| `requireActiveOrganization` | Ensures employer organization status is `ACTIVE` |
| `requireActiveInstitution` | Ensures institution status is `ACTIVE` |
| `requireCredentialOwner` | Ensures citizen owns credential before sharing it |
| `requireInstitutionOwnership` | Ensures institution owns credential before updating/revoking |
| `requireAccessGrant` | Ensures employer organization has active, unexpired credential access |
| `validateRequest` | Validates body, params, and query values |
| `uploadFile` | Validates uploaded document file type and file size |
| `errorHandler` | Returns consistent safe error responses |

---

# API Routes

## Authentication

| Method | Route | Description |
|---|---|---|
| `POST` | `/auth/register` | Register Citizen, Organization, or Institution |
| `POST` | `/auth/login` | Login and receive JWT |
| `POST` | `/auth/logout` | Logout user if refresh-token/cookie flow is used |
| `GET` | `/auth/me` | Get current authenticated user |
| `POST` | `/auth/forgot-password` | Send password-reset OTP |
| `POST` | `/auth/forgot-password/verify` | Verify OTP and update password |
| `POST` | `/auth/resend-password-otp` | Resend password-reset OTP |

---

## Admin

| Method | Route | Description |
|---|---|---|
| `GET` | `/admin/dashboard` | Get Admin dashboard counts |
| `GET` | `/admin/approval-queue` | Get pending organizations and institutions |
| `GET` | `/admin/organizations/pending` | Get pending employer organizations |
| `PATCH` | `/admin/organizations/:organizationId/approve` | Approve employer organization |
| `PATCH` | `/admin/organizations/:organizationId/reject` | Reject employer organization |
| `GET` | `/admin/institutions/pending` | Get pending institutions |
| `PATCH` | `/admin/institutions/:institutionId/approve` | Approve institution |
| `PATCH` | `/admin/institutions/:institutionId/reject` | Reject institution |
| `GET` | `/admin/users` | List users |

---

## Organizations

| Method | Route | Description |
|---|---|---|
| `POST` | `/organizations` | Create employer organization profile |
| `GET` | `/organizations/me` | Get logged-in employer organization |
| `PATCH` | `/organizations/me` | Update employer organization profile |
| `GET` | `/organizations/shared-credentials` | Get credentials shared with active organization |
| `GET` | `/organizations/shared-credentials/:credentialId` | Get one shared credential |
| `GET` | `/organizations/verification-requests` | Get organization verification requests |

---

## Institutions

| Method | Route | Description |
|---|---|---|
| `POST` | `/institutions` | Create institution onboarding profile |
| `GET` | `/institutions` | Get active institutions |
| `GET` | `/institutions/:institutionId` | Get one institution profile |
| `GET` | `/institutions/me` | Get logged-in institution profile |
| `PATCH` | `/institutions/me` | Update institution profile |
| `GET` | `/institutions/me/credentials` | Get credentials issued by institution |
| `GET` | `/institutions/me/verification-requests` | Get employer verification requests |
| `GET` | `/institutions/me/submissions` | Get citizen legacy submissions |

---

## Credentials

| Method | Route | Description |
|---|---|---|
| `POST` | `/credentials` | Issue official credential |
| `GET` | `/credentials/:credentialId` | Get credential if user is authorized |
| `PATCH` | `/credentials/:credentialId` | Update credential details |
| `PATCH` | `/credentials/:credentialId/status` | Update credential status |
| `POST` | `/credentials/import` | Import official institution credentials from CSV |
| `GET` | `/credentials/:credentialId/qr` | Get QR code/data for credential |

---

## Citizen Wallet

| Method | Route | Description |
|---|---|---|
| `GET` | `/wallet` | Get citizen wallet credentials |
| `POST` | `/wallet/claim` | Claim institution-issued credential |
| `GET` | `/wallet/credentials/:credentialId` | Get one citizen-owned credential |

---

## Citizen Legacy Document Submissions

| Method | Route | Description |
|---|---|---|
| `POST` | `/credential-submissions` | Citizen submits legacy certificate/document |
| `GET` | `/credential-submissions/me` | Get logged-in citizen submissions |
| `GET` | `/credential-submissions/:submissionId` | Get authorized submission detail |
| `PATCH` | `/credential-submissions/:submissionId/respond` | Institution responds to citizen submission |

---

## Access Grants

| Method | Route | Description |
|---|---|---|
| `POST` | `/credentials/:credentialId/access-grants` | Citizen shares credential with organization |
| `GET` | `/credentials/:credentialId/access-grants` | Citizen gets grants for one credential |
| `GET` | `/access-grants` | Citizen gets all created grants |
| `PATCH` | `/access-grants/:accessGrantId/revoke` | Citizen revokes employer access |
| `PATCH` | `/access-grants/:accessGrantId/extend` | Optional: extend access expiry |

---

## Verification Requests

| Method | Route | Description |
|---|---|---|
| `POST` | `/verification-requests` | Employer requests fresh credential confirmation |
| `GET` | `/verification-requests/:requestId` | Get one authorized request |
| `PATCH` | `/verification-requests/:requestId/respond` | Institution confirms/rejects/manual-review response |

---

## QR

| Method | Route | Description |
|---|---|---|
| `GET` | `/credentials/:credentialId/qr` | Generate or retrieve QR information |
| `POST` | `/qr/resolve` | Optional protected QR resolution endpoint |

> `POST /qr/resolve` is optional. The frontend/mobile app can scan a Credential ID and navigate to the existing protected credential endpoint instead.

---

# Authentication Flow

```text
User registers
        ↓
User logs in with email and password
        ↓
Backend validates password hash
        ↓
Backend creates JWT
        ↓
Frontend/mobile stores token securely
        ↓
Frontend/mobile calls GET /auth/me
        ↓
System redirects user according to role and approval status
```

---

# Forgot Password Flow

```text
User opens Forgot Password screen
        ↓
User enters email
        ↓
POST /auth/forgot-password
        ↓
Backend creates OTP, stores OTP hash, sends OTP to email
        ↓
User enters OTP + new password on same frontend screen
        ↓
POST /auth/forgot-password/verify
        ↓
Backend validates OTP and updates passwordHash
        ↓
User logs in with new password
```

---

# Institution Credential Issuance Flow

```text
Active Institution logs in
        ↓
POST /credentials
        ↓
Backend checks:
- JWT is valid
- Role is INSTITUTION
- Institution status is ACTIVE
        ↓
Backend generates:
- credentialId
- qrToken
        ↓
Backend creates official Credential record
        ↓
Credential status = VERIFIED
        ↓
Citizen can view/claim credential in wallet
```

---

# Citizen Credential Sharing Flow

```text
Citizen opens own credential
        ↓
POST /credentials/:credentialId/access-grants
        ↓
Backend checks:
- JWT is valid
- Role is CITIZEN
- Citizen owns credential
- Employer organization exists
- Employer organization status is ACTIVE
        ↓
Backend creates AccessGrant
        ↓
Employer organization can now view that credential
```

---

# Employer Verification Request Flow

```text
Approved Employer opens shared credential
        ↓
GET /organizations/shared-credentials/:credentialId
        ↓
Backend checks:
- JWT is valid
- User role is ORGANIZATION
- Organization is ACTIVE
- Active access grant exists
        ↓
Employer requests fresh confirmation
        ↓
POST /verification-requests
        ↓
Request status = PENDING
        ↓
Institution receives request
        ↓
Institution responds:
VERIFIED / REJECTED / REQUIRES_MANUAL_REVIEW
```

---

# Citizen Legacy Submission Flow

```text
Citizen uploads old certificate
        ↓
POST /credential-submissions
        ↓
Citizen selects ACTIVE institution
        ↓
Submission status = PENDING_VERIFICATION
        ↓
Institution checks official credential record
        ↓
Institution confirms/rejects/manual review
        ↓
Submission is linked to official credential when confirmed
```

---

# Example API Responses

## Successful Response

```json
{
  "success": true,
  "message": "Credential created successfully",
  "data": {
    "credentialId": "VDOC-LTSA-2026-00021",
    "status": "VERIFIED"
  }
}
```

## Validation Error

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "holderEmail",
      "message": "A valid email address is required."
    }
  ]
}
```

## Unauthorized Error

```json
{
  "success": false,
  "message": "Authentication is required.",
  "code": "UNAUTHORIZED"
}
```

## Access Denied Error

```json
{
  "success": false,
  "message": "This credential has not been shared with your organization.",
  "code": "ACCESS_DENIED"
}
```

## Pending Approval Error

```json
{
  "success": false,
  "message": "Your organization is awaiting Admin approval.",
  "code": "ORGANIZATION_PENDING_APPROVAL"
}
```

---

# HTTP Status Codes

| Code | Meaning |
|---|---|
| `200` | Successful request |
| `201` | Resource created |
| `400` | Invalid request data |
| `401` | Missing, invalid, or expired JWT |
| `403` | Logged in but not permitted |
| `404` | Resource not found |
| `409` | Duplicate/conflicting record |
| `500` | Internal server error |

---

# Security Requirements

- Hash passwords using bcrypt.
- Hash password-reset OTPs before storage.
- Never store plain passwords.
- Never store plain OTPs.
- Store secrets in `.env`, never in source code.
- Do not expose MongoDB URI to frontend/mobile applications.
- Do not trust role values sent by frontend.
- Check JWT, user role, organization/institution status, ownership, and access grants on backend.
- Use HTTPS in deployment.
- Validate all request bodies, parameters, and uploaded files.
- Restrict allowed document file types and upload sizes.
- Use fictional demo users and credentials only.
- Do not delete revoked credentials; change their status to `REVOKED`.
- Do not delete revoked access grants; change their status to `REVOKED`.

---

# Seed Data

Use fictional demo data only.

## Demo Institutions

```text
Metro University
Lagos Digital Polytechnic
Lagos Tech Skills Academy
```

## Demo User Accounts

```text
Admin:
admin@verifydoc.demo

Citizen:
amina@verifydoc.demo

Employer:
recruiter@brighthire.demo

Institution:
registrar@metrouniversity.demo
admin@lagosdigitalpoly.demo
admin@lagostechskills.demo
```

## Seed Credential States

```text
VERIFIED
REVOKED
EXPIRED
PENDING_VERIFICATION
REJECTED
REQUIRES_MANUAL_REVIEW
```

---

# Recommended Build Order

1. Set up Express application, MongoDB connection, environment configuration, and error handler.
2. Build User model, registration, login, JWT authentication, and forgot-password OTP flow.
3. Build Organization and Institution onboarding models/routes.
4. Build Admin approval queue and approval endpoints.
5. Build Credential model, credential issuance, Credential ID generation, and QR token generation.
6. Build Citizen Wallet and credential claiming.
7. Build Access Grants and protected employer shared-credential endpoints.
8. Build Verification Requests and institution response flow.
9. Build Credential Submissions and file upload only if core flow is complete.
10. Add seed data, API tests, deployment, and API documentation.

---

# MVP Exclusions

```text
No public credential search
No public QR verification
No anonymous share links
No public citizen lookup
No audit logs
No notifications
No fraud reports
No government/external API integrations
No payment system
No advanced analytics
No AI/OCR document fraud detection
```

---

# Final Principle

> VerifyDoc is a private, permission-based credential-verification platform. Official credentials are created and managed by Admin-approved institutions. Citizens control which approved employer organizations can view specific credentials. Employers can request fresh confirmation from the issuing institution, and the backend enforces authentication, role-based access, approval status, ownership, and access-grant permissions on every protected action.