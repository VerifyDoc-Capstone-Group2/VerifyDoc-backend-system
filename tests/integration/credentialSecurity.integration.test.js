import { beforeAll, afterAll, describe, it, expect } from "vitest";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import request from "supertest";
import app from "../../app.js";
import { User } from "../../models/userModel.js";
import { Organization } from "../../models/organizationModel.js";
import { Institution } from "../../models/institutionModel.js";
import { Credential } from "../../models/credentialModel.js";
import { CredentialShare } from "../../models/credentialShareModel.js";
import { ConfirmationRequest } from "../../models/confirmationRequestModel.js";

const uri = process.env.TEST_MONGODB_URI;
if (!uri) throw new Error("TEST_MONGODB_URI is required for integration tests; never use a production database.");
if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is required for integration tests.");

const ids = { users: [], organizations: [], institutions: [], credentials: [], shares: [], requests: [] };
const tag = new mongoose.Types.ObjectId().toString().slice(-12);
let citizen, outsider, orgUser, otherOrgUser, instUser, otherInstUser, org, otherOrg, inst, credential, share;
const token = user => jwt.sign({ userId: String(user._id), role: user.role }, process.env.JWT_SECRET, { expiresIn: "10m" });
const authorized = (method, path, user) => request(app)[method](path).set("Authorization", `Bearer ${token(user)}`);
const expiry = () => new Date(Date.now() + 86400000).toISOString();
const credentialId = "VDOC-CRED-" + String(parseInt(tag.slice(-8), 16) % 100000000).padStart(8, "0");

beforeAll(async () => {
  // Refuse potentially dangerous DB names. This suite creates and removes only its own fixtures.
  const dbName = new URL(uri).pathname.replace(/^\//, "").split("?")[0];
  if (!/^verifydoc[_-]test(?:[_-].*)?$/i.test(dbName)) {
    throw new Error("TEST_MONGODB_URI must point to a dedicated verifydoc_test database.");
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  const user = async (role, extra = {}) => {
    const u = await User.create({ firstName: "Integration", lastName: role, email: `${new mongoose.Types.ObjectId()}@example.test`, password: "test-only-placeholder", role, accountStatus: "Active", ...extra });
    ids.users.push(u._id); return u;
  };
  citizen = await user("Citizen"); outsider = await user("Citizen");
  org = await Organization.create({ organizationName: "Test Employer", organizationType: "Employer", organizationId: `ORG-${tag}`, cacNumber: `RC-${tag}`, cacCertificate: { url: "https://example.test/cac", publicId: "test" }, officialEmail: `org-${tag}@example.test`, phoneNumber: "000000000", address: "Test only", status: "Active" });
  ids.organizations.push(org._id);
  otherOrg = await Organization.create({ organizationName: "Other Employer", organizationType: "Employer", organizationId: `ORG-OTHER-${tag}`, cacNumber: `RC-OTHER-${tag}`, cacCertificate: { url: "https://example.test/cac", publicId: "test" }, officialEmail: `other-${tag}@example.test`, phoneNumber: "000000000", address: "Test only", status: "Active" });
  ids.organizations.push(otherOrg._id);
  inst = await Institution.create({ institutionName: "Test University", institutionType: "University", institutionId: `INST-${tag}`, officialEmail: `inst-${tag}@example.test`, phoneNumber: "000000000", address: "Test only", accreditationDocument: { url: "https://example.test/accreditation", publicId: "test" }, status: "Active" });
  ids.institutions.push(inst._id);
  orgUser = await user("Organization", { organizationId: org.organizationId, membershipStatus: "Active" });
  otherOrgUser = await user("Organization", { organizationId: otherOrg.organizationId, membershipStatus: "Active" });
  instUser = await user("Institution", { institutionId: inst.institutionId, membershipStatus: "Active" });
  otherInstUser = await user("Institution", { institutionId: `INST-OTHER-${tag}`, membershipStatus: "Active" });
  credential = await Credential.create({ credentialId, institution: inst._id, issuerName: inst.institutionName, citizenId: citizen._id, credentialType: "Degree", title: "Test Degree", issueDate: new Date("2024-01-01"), document: { url: "https://example.test/private.pdf", publicId: "test-private" }, source: "Institution", verificationStatus: "Verified", status: "Active", createdByUserId: instUser._id });
  ids.credentials.push(credential._id);
}, 30000);

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    // Remove only records created by this suite, never clear whole collections.
    await ConfirmationRequest.deleteMany({ _id: { $in: ids.requests } });
    await CredentialShare.deleteMany({ _id: { $in: ids.shares } });
    await Credential.deleteMany({ _id: { $in: ids.credentials } });
    await User.deleteMany({ _id: { $in: ids.users } });
    await Organization.deleteMany({ _id: { $in: ids.organizations } });
    await Institution.deleteMany({ _id: { $in: ids.institutions } });
    await mongoose.disconnect();
  }
}, 30000);

describe.sequential("Real MongoDB + HTTP authorization and sharing lifecycle", () => {
  it("rejects requests without a JWT and invalid JWTs", async () => {
    expect((await request(app).get("/credential-shares/mine")).status).toBe(401);
    expect((await request(app).get("/credential-shares/mine").set("Authorization", "Bearer invalid")).status).toBe(401);
  });

  it("blocks cross-user credential sharing", async () => {
    const res = await authorized("post", "/credential-shares", outsider).send({ credentialId, organizationId: String(org._id), purpose: "Hiring", expiresAt: expiry() });
    expect(res.status).toBe(404);
  });

  it("blocks Citizen sharing of unverified credentials", async () => {
    await Credential.updateOne({ _id: credential._id }, { $set: { verificationStatus: "Pending" } });
    const res = await authorized("post", "/credential-shares", citizen).send({ credentialId, organizationId: String(org._id), purpose: "Hiring", expiresAt: expiry() });
    expect(res.status).toBe(409);
    await Credential.updateOne({ _id: credential._id }, { $set: { verificationStatus: "Verified" } });
  });

  it("creates a share and restricts visibility to the recipient Organization", async () => {
    const created = await authorized("post", "/credential-shares", citizen).send({ credentialId, organizationId: String(org._id), purpose: "Hiring", expiresAt: expiry() });
    expect(created.status).toBe(201);
    share = await CredentialShare.findById(created.body.data._id);
    expect(share).toBeTruthy();
    ids.shares.push(share._id);
    const forbidden = await authorized("get", `/credential-shares/organization/${share._id}`, otherOrgUser);
    expect(forbidden.status).toBe(404);
    const allowed = await authorized("get", `/credential-shares/organization/${share._id}`, orgUser);
    expect(allowed.status).toBe(200);
    expect(JSON.stringify(allowed.body)).not.toContain("private.pdf");
  });

  it("prevents an unrelated Organization from requesting fresh confirmation", async () => {
    const res = await authorized("post", `/credential-shares/organization/${share._id}/confirmations`, otherOrgUser).send({ reason: "Hiring" });
    expect(res.status).toBe(404);
  });

  it("allows only the issuing Institution to respond", async () => {
    const created = await authorized("post", `/credential-shares/organization/${share._id}/confirmations`, orgUser).send({ reason: "Hiring" });
    expect(created.status).toBe(201);
    const confirmationId = created.body.data.id;
    ids.requests.push(confirmationId);
    const duplicate = await authorized("post", `/credential-shares/organization/${share._id}/confirmations`, orgUser).send({ reason: "Hiring" });
    expect(duplicate.status).toBe(409);
    const unrelated = await authorized("patch", `/credential-confirmations/institution/${confirmationId}/respond`, otherInstUser).send({ decision: "Confirmed" });
    expect(unrelated.status).toBe(403);
    const approved = await authorized("patch", `/credential-confirmations/institution/${confirmationId}/respond`, instUser).send({ decision: "Confirmed" });
    expect(approved.status).toBe(200);
    const replay = await authorized("patch", `/credential-confirmations/institution/${confirmationId}/respond`, instUser).send({ decision: "Confirmed" });
    expect(replay.status).toBe(404);
    expect((await Credential.findById(credential._id)).verificationStatus).toBe("Verified");
  });

  it("blocks access after share revocation", async () => {
    const revoked = await authorized("patch", `/credential-shares/${share._id}/revoke`, citizen);
    expect(revoked.status).toBe(200);
    expect((await authorized("get", `/credential-shares/organization/${share._id}`, orgUser)).status).toBe(404);
    expect((await authorized("post", `/credential-shares/organization/${share._id}/confirmations`, orgUser).send({ reason: "Hiring" })).status).toBe(404);
  });
});
