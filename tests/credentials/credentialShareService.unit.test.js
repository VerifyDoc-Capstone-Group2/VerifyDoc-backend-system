import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";

vi.mock("../../models/userModel.js", () => ({ User: { findById: vi.fn() } }));
vi.mock("../../models/credentialModel.js", () => ({ Credential: { findOne: vi.fn(), find: vi.fn() } }));
vi.mock("../../models/organizationModel.js", () => ({ Organization: { findById: vi.fn(), findOne: vi.fn(), find: vi.fn(), countDocuments: vi.fn() } }));
vi.mock("../../models/credentialShareModel.js", () => ({
  CredentialShare: { create: vi.fn(), findOne: vi.fn(), findOneAndUpdate: vi.fn(), find: vi.fn(), countDocuments: vi.fn() }
}));

import { User } from "../../models/userModel.js";
import { Credential } from "../../models/credentialModel.js";
import { Organization } from "../../models/organizationModel.js";
import { CredentialShare } from "../../models/credentialShareModel.js";
import {
  createCredentialShare, getOrganizationSharedCredential, revokeCredentialShare,
  listEligibleOrganizations, getCitizenShares
} from "../../services/credentialShareService.js";

const citizenId = new mongoose.Types.ObjectId();
const orgId = new mongoose.Types.ObjectId();
const credentialObjectId = new mongoose.Types.ObjectId();
const shareId = new mongoose.Types.ObjectId();
const credentialId = "VDOC-CRED-12345678";
const identity = { userId: String(citizenId) };
const valid = () => ({ credentialId, organizationId: String(orgId), purpose: "Employment verification", expiresAt: new Date(Date.now() + 86400000).toISOString() });
const citizen = { _id: citizenId, role: "Citizen", accountStatus: "Active" };
const credential = { _id: credentialObjectId, citizenId, status: "Active", verificationStatus: "Verified", credentialId };
const organization = { _id: orgId, status: "Active", organizationName: "Example Employer" };
const share = { _id: shareId, credential: credentialObjectId, citizen: citizenId, organization: orgId, status: "Active", expiresAt: new Date(Date.now() + 86400000), purpose: "Employment verification" };
const setupCitizen = () => {
  User.findById.mockResolvedValue(citizen);
  Credential.findOne.mockResolvedValue(credential);
  Organization.findById.mockResolvedValue(organization);
  CredentialShare.create.mockImplementation(async x => ({ ...x, _id: shareId }));
};
const setupOrganization = () => {
  User.findById.mockResolvedValue({ _id: citizenId, role: "Organization", accountStatus: "Active", membershipStatus: "Active", organizationId: "ORG-001" });
  Organization.findOne.mockResolvedValue(organization);
};
describe("Credential share service security", () => {
  beforeEach(() => vi.resetAllMocks());

  it("creates an access grant for an owned verified credential and approved organization", async () => {
    setupCitizen();
    const result = await createCredentialShare(valid(), identity);
    expect(result.credential).toEqual(credentialObjectId);
    expect(CredentialShare.create).toHaveBeenCalledOnce();
  });

  it("rejects sharing credentials that are not owned by the Citizen", async () => {
    setupCitizen();
    Credential.findOne.mockResolvedValue(null);
    await expect(createCredentialShare(valid(), identity)).rejects.toMatchObject({ statusCode: 404 });
    expect(CredentialShare.create).not.toHaveBeenCalled();
  });

  it.each(["Pending", "Rejected"])("rejects %s credentials", async status => {
    setupCitizen();
    Credential.findOne.mockResolvedValue({ ...credential, verificationStatus: status });
    await expect(createCredentialShare(valid(), identity)).rejects.toMatchObject({ statusCode: 409 });
  });

  it("rejects revoked credentials", async () => {
    setupCitizen();
    Credential.findOne.mockResolvedValue({ ...credential, status: "Revoked" });
    await expect(createCredentialShare(valid(), identity)).rejects.toMatchObject({ statusCode: 409 });
  });

  it("rejects unapproved organizations", async () => {
    setupCitizen();
    Organization.findById.mockResolvedValue({ ...organization, status: "Pending Approval" });
    await expect(createCredentialShare(valid(), identity)).rejects.toMatchObject({ statusCode: 403 });
  });

  it("rejects expired or overly long grants", async () => {
    setupCitizen();
    await expect(createCredentialShare({ ...valid(), expiresAt: new Date(Date.now() - 1000).toISOString() }, identity)).rejects.toMatchObject({ statusCode: 400 });
    await expect(createCredentialShare({ ...valid(), expiresAt: new Date(Date.now() + 366 * 86400000).toISOString() }, identity)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("rejects Organization users trying to create Citizen shares", async () => {
    setupCitizen();
    User.findById.mockResolvedValue({ ...citizen, role: "Organization" });
    await expect(createCredentialShare(valid(), identity)).rejects.toMatchObject({ statusCode: 403 });
  });

  it("revokes a Citizen's grant using an ownership-scoped update", async () => {
    setupCitizen();
    CredentialShare.findOneAndUpdate.mockResolvedValue({ ...share, status: "Revoked", revokedAt: new Date() });
    const result = await revokeCredentialShare(String(shareId), identity);
    expect(result.status).toBe("Revoked");
    expect(CredentialShare.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: String(shareId), citizen: citizenId, status: "Active" }),
      expect.objectContaining({ $set: expect.objectContaining({ status: "Revoked" }) }),
      { new: true }
    );
  });

  it("rejects Organization access when the share has expired", async () => {
    setupOrganization();
    CredentialShare.findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });
    await expect(getOrganizationSharedCredential(String(shareId), identity)).rejects.toMatchObject({ statusCode: 404 });
    expect(CredentialShare.findOne).toHaveBeenCalledWith(expect.objectContaining({ organization: orgId, expiresAt: { $gt: expect.any(Date) } }));
  });

  it("rejects Organization access to revoked credentials", async () => {
    setupOrganization();
    CredentialShare.findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(share) });
    Credential.findOne.mockReturnValue({ select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }) });
    await expect(getOrganizationSharedCredential(String(shareId), identity)).rejects.toMatchObject({ statusCode: 403 });
  });

  it("does not expose document URLs in Organization credential detail", async () => {
    setupOrganization();
    CredentialShare.findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(share) });
    Credential.findOne.mockReturnValue({ select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue({ ...credential, title: "Degree", document: { url: "private" } }) }) });
    const result = await getOrganizationSharedCredential(String(shareId), identity);
    expect(result.credential).not.toHaveProperty("document");
    expect(result.status).toBe("Active");
  });

  it("rejects unapproved Organizations accessing shared credentials", async () => {
    setupOrganization();
    Organization.findOne.mockResolvedValue({ ...organization, status: "Suspended" });
    await expect(getOrganizationSharedCredential(String(shareId), identity)).rejects.toMatchObject({ statusCode: 403 });
  });

  it("lists only approved Organizations", async () => {
    setupCitizen();
    Organization.countDocuments.mockResolvedValue(1);
    Organization.find.mockReturnValue({ select: () => ({ sort: () => ({ skip: () => ({ limit: () => ({ lean: async () => [organization] }) }) }) }) });
    const result = await listEligibleOrganizations(identity);
    expect(result.organizations).toHaveLength(1);
    expect(Organization.countDocuments).toHaveBeenCalledWith({ status: "Active" });
  });

  it("marks an expired share as Expired in the Citizen history", async () => {
    setupCitizen();
    CredentialShare.countDocuments.mockResolvedValue(1);
    CredentialShare.find.mockReturnValue({ sort: () => ({ skip: () => ({ limit: () => ({ lean: async () => [{ ...share, expiresAt: new Date(Date.now() - 86400000) }] }) }) }) });
    Credential.find.mockReturnValue({ select: () => ({ lean: async () => [credential] }) });
    Organization.find.mockReturnValue({ select: () => ({ lean: async () => [organization] }) });
    const result = await getCitizenShares(identity);
    expect(result.shares[0].status).toBe("Expired");
  });
});
