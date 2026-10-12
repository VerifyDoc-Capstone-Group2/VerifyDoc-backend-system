import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";

vi.mock("../../models/userModel.js", () => ({ User: { findById: vi.fn() } }));
vi.mock("../../models/organizationModel.js", () => ({ Organization: { findOne: vi.fn() } }));
vi.mock("../../models/institutionModel.js", () => ({ Institution: { findOne: vi.fn(), findById: vi.fn() } }));
vi.mock("../../models/credentialModel.js", () => ({ Credential: { findOne: vi.fn() } }));
vi.mock("../../models/credentialShareModel.js", () => ({ CredentialShare: { findOne: vi.fn() } }));
vi.mock("../../models/confirmationRequestModel.js", () => ({ ConfirmationRequest: { findOne: vi.fn(), create: vi.fn(), findOneAndUpdate: vi.fn() } }));

import { User } from "../../models/userModel.js";
import { Organization } from "../../models/organizationModel.js";
import { Institution } from "../../models/institutionModel.js";
import { Credential } from "../../models/credentialModel.js";
import { CredentialShare } from "../../models/credentialShareModel.js";
import { ConfirmationRequest } from "../../models/confirmationRequestModel.js";
import { requestFreshConfirmation, respondToFreshConfirmation } from "../../services/freshConfirmationService.js";

const uid = new mongoose.Types.ObjectId(), oid = new mongoose.Types.ObjectId();
const iid = new mongoose.Types.ObjectId(), cid = new mongoose.Types.ObjectId(), sid = new mongoose.Types.ObjectId(), rid = new mongoose.Types.ObjectId();
const identity = { userId: String(uid) };
const org = { _id: oid, status: "Active" };
const institution = { _id: iid, status: "Active" };
const share = { _id: sid, credential: cid, organization: oid, citizen: new mongoose.Types.ObjectId(), status: "Active", expiresAt: new Date(Date.now() + 86400000) };
const credential = { _id: cid, institution: iid, status: "Active", verificationStatus: "Verified" };
const pending = { _id: rid, share: sid, credential: cid, organization: oid, institution: iid, status: "Pending" };

const orgSetup = () => {
  User.findById.mockResolvedValue({ _id: uid, role: "Organization", accountStatus: "Active", membershipStatus: "Active", organizationId: "ORG-1" });
  Organization.findOne.mockResolvedValue(org);
  CredentialShare.findOne.mockResolvedValue(share);
  Credential.findOne.mockResolvedValue(credential);
  Institution.findById.mockResolvedValue(institution);
  ConfirmationRequest.findOne.mockResolvedValue(null);
  ConfirmationRequest.create.mockImplementation(async data => ({ ...data, _id: rid, status: "Pending" }));
};
const instSetup = () => {
  User.findById.mockResolvedValue({ _id: uid, role: "Institution", accountStatus: "Active", membershipStatus: "Active", institutionId: "INST-1" });
  Institution.findOne.mockResolvedValue(institution);
  ConfirmationRequest.findOne.mockResolvedValue(pending);
  CredentialShare.findOne.mockResolvedValue(share);
  Credential.findOne.mockResolvedValue(credential);
  ConfirmationRequest.findOneAndUpdate.mockImplementation(async (_filter, update) => ({ ...pending, ...update.$set }));
};

describe("Fresh confirmation service", () => {
  beforeEach(() => vi.resetAllMocks());

  it("allows an approved Organization to request confirmation for an active share", async () => {
    orgSetup();
    const result = await requestFreshConfirmation(String(sid), "Employment verification", identity);
    expect(result.status).toBe("Pending");
    expect(ConfirmationRequest.create).toHaveBeenCalledOnce();
  });

  it("rejects requests without an active share", async () => {
    orgSetup();
    CredentialShare.findOne.mockResolvedValue(null);
    await expect(requestFreshConfirmation(String(sid), "Employment verification", identity)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("rejects requests for revoked credentials", async () => {
    orgSetup();
    Credential.findOne.mockResolvedValue(null);
    await expect(requestFreshConfirmation(String(sid), "Employment verification", identity)).rejects.toMatchObject({ statusCode: 403 });
  });

  it("rejects requests for unregistered issuers", async () => {
    orgSetup();
    Credential.findOne.mockResolvedValue({ ...credential, institution: undefined });
    await expect(requestFreshConfirmation(String(sid), "Employment verification", identity)).rejects.toMatchObject({ statusCode: 409 });
  });

  it("rejects duplicate pending requests", async () => {
    orgSetup();
    ConfirmationRequest.findOne.mockResolvedValue(pending);
    await expect(requestFreshConfirmation(String(sid), "Employment verification", identity)).rejects.toMatchObject({ statusCode: 409 });
  });

  it("prevents Institutions from initiating Organization requests", async () => {
    orgSetup();
    User.findById.mockResolvedValue({ _id: uid, role: "Institution", accountStatus: "Active", membershipStatus: "Active" });
    await expect(requestFreshConfirmation(String(sid), "Employment verification", identity)).rejects.toMatchObject({ statusCode: 403 });
  });

  it("allows the issuing Institution to confirm without modifying the credential", async () => {
    instSetup();
    const result = await respondToFreshConfirmation(String(rid), { decision: "Confirmed" }, identity);
    expect(result.status).toBe("Confirmed");
    expect(ConfirmationRequest.findOneAndUpdate).toHaveBeenCalledOnce();
  });

  it("requires a reason when an Institution disputes a credential", async () => {
    instSetup();
    await expect(respondToFreshConfirmation(String(rid), { decision: "Disputed" }, identity)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("rejects responses if the credential share is no longer active", async () => {
    instSetup();
    CredentialShare.findOne.mockResolvedValue(null);
    await expect(respondToFreshConfirmation(String(rid), { decision: "Confirmed" }, identity)).rejects.toMatchObject({ statusCode: 409 });
  });

  it("rejects unauthorized Institutions", async () => {
    instSetup();
    ConfirmationRequest.findOne.mockResolvedValue(null);
    await expect(respondToFreshConfirmation(String(rid), { decision: "Confirmed" }, identity)).rejects.toMatchObject({ statusCode: 404 });
  });
});
