import { beforeEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";

vi.mock("../../models/userModel.js", () => ({ User: { findById: vi.fn() } }));
vi.mock("../../models/institutionModel.js", () => ({
  Institution: { findOne: vi.fn(), findById: vi.fn() }
}));
vi.mock("../../models/credentialModel.js", () => ({
  Credential: { create: vi.fn() }
}));

import { User } from "../../models/userModel.js";
import { Institution } from "../../models/institutionModel.js";
import { Credential } from "../../models/credentialModel.js";
import { createCredential } from "../../services/credentialService.js";

const citizenId = new mongoose.Types.ObjectId();
const institutionUserId = new mongoose.Types.ObjectId();
const institutionMongoId = new mongoose.Types.ObjectId();
const otherCitizenId = new mongoose.Types.ObjectId();
const document = { url: "https://res.cloudinary.com/demo/raw/upload/file.pdf", publicId: "verifydoc/file" };
const common = {
  credentialType: "Degree", title: "B.Sc. Chemistry",
  issueDate: "2024-06-15", graduationYear: "2024", document
};
const citizen = { _id: citizenId, role: "Citizen", accountStatus: "Active" };
const issuerUser = {
  _id: institutionUserId, role: "Institution", accountStatus: "Active",
  membershipStatus: "Active", institutionId: "VDOC-INS-ABC-1234"
};
const issuer = { _id: institutionMongoId, institutionName: "Example University", status: "Active" };

const errorStatus = async (promise, status) => {
  try {
    await promise;
    throw new Error("Expected createCredential to reject");
  } catch (error) {
    expect(error.statusCode ?? error.status).toBe(status);
  }
};

beforeEach(() => {
  vi.resetAllMocks();
  User.findById.mockImplementation(async id => String(id) === String(citizenId) ? citizen : null);
  Institution.findById.mockResolvedValue(issuer);
  Institution.findOne.mockResolvedValue(issuer);
  Credential.create.mockImplementation(async data => data);
});

describe("createCredential", () => {
  it("issues an immediately verified credential from an active Institution", async () => {
    User.findById.mockImplementation(async id => {
      if (String(id) === String(institutionUserId)) return issuerUser;
      if (String(id) === String(otherCitizenId)) return { ...citizen, _id: otherCitizenId };
      return null;
    });
    const result = await createCredential({ ...common, citizenId: String(otherCitizenId) }, { userId: String(institutionUserId) });
    expect(result.source).toBe("Institution");
    expect(result.verificationStatus).toBe("Verified");
    expect(result.issuerName).toBe("Example University");
    expect(String(result.institution)).toBe(String(institutionMongoId));
    expect(String(result.citizenId)).toBe(String(otherCitizenId));
    expect(String(result.verifiedByInstitutionUserId)).toBe(String(institutionUserId));
    expect(result.verifiedAt).toBeInstanceOf(Date);
    expect(result.credentialId).toMatch(/^VDOC-CRED-\d{8}$/);
  });

  it("keeps a Citizen upload from an unregistered issuer Pending", async () => {
    const result = await createCredential({ ...common, issuerName: "  Independent College  " }, citizen);
    expect(result.source).toBe("Citizen");
    expect(result.verificationStatus).toBe("Pending");
    expect(result.issuerName).toBe("Independent College");
    expect(result.institution).toBeUndefined();
    expect(String(result.citizenId)).toBe(String(citizenId));
  });

  it("keeps a Citizen upload attributed to a registered Institution Pending", async () => {
    const result = await createCredential({ ...common, institution: String(institutionMongoId) }, citizen);
    expect(result.verificationStatus).toBe("Pending");
    expect(result.issuerName).toBe("Example University");
    expect(String(result.institution)).toBe(String(institutionMongoId));
  });

  it("does not allow a Citizen to choose another wallet", async () => {
    await errorStatus(createCredential({ ...common, issuerName: "College", citizenId: String(otherCitizenId) }, citizen), 400);
    expect(Credential.create).not.toHaveBeenCalled();
  });

  it("rejects inactive accounts", async () => {
    User.findById.mockResolvedValue({ ...citizen, accountStatus: "Rejected" });
    await errorStatus(createCredential({ ...common, issuerName: "College" }, citizen), 403);
  });

  it("rejects non-issuer roles", async () => {
    User.findById.mockResolvedValue({ ...citizen, role: "Organization" });
    await errorStatus(createCredential({ ...common, issuerName: "College" }, citizen), 403);
  });

  it("rejects an inactive Institution membership", async () => {
    User.findById.mockImplementation(async id => String(id) === String(institutionUserId)
      ? { ...issuerUser, membershipStatus: "Pending" } : citizen);
    await errorStatus(createCredential({ ...common, citizenId: String(citizenId) }, issuerUser), 403);
  });

  it.each([
    ["missing title", { title: undefined }],
    ["invalid date", { issueDate: "2024-99-99" }],
    ["future date", { issueDate: "2999-01-01" }],
    ["non-integer graduation year", { graduationYear: "2024.5" }],
    ["missing document publicId", { document: { url: document.url } }],
    ["insecure document URL", { document: { ...document, url: "http://example.com/file.pdf" } }]
  ])("rejects %s", async (_name, override) => {
    await errorStatus(createCredential({ ...common, issuerName: "College", ...override }, citizen), 400);
    expect(Credential.create).not.toHaveBeenCalled();
  });

  it("retries a credential ID collision", async () => {
    Credential.create.mockRejectedValueOnce({
      code: 11000, keyPattern: { credentialId: 1 }
    }).mockImplementationOnce(async data => data);
    const result = await createCredential({ ...common, issuerName: "College" }, citizen);
    expect(result.credentialId).toMatch(/^VDOC-CRED-\d{8}$/);
    expect(Credential.create).toHaveBeenCalledTimes(2);
  });

  it("does not retry an unrelated database error", async () => {
    Credential.create.mockRejectedValue({ code: 11000, keyPattern: { otherField: 1 } });
    await expect(createCredential({ ...common, issuerName: "College" }, citizen))
      .rejects.toMatchObject({ code: 11000 });
    expect(Credential.create).toHaveBeenCalledTimes(1);
  });
});
