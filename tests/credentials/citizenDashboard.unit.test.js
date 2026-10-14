import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCitizenDashboard } from "../../services/citizenDashboardService.js";
import { User } from "../../models/userModel.js";
import { Credential } from "../../models/credentialModel.js";
import { CredentialShare } from "../../models/credentialShareModel.js";
import { Organization } from "../../models/organizationModel.js";

const citizenId = "507f1f77bcf86cd799439011";
const makeQuery = (value) => {
  const q = {
    select: vi.fn(() => q),
    sort: vi.fn(() => q),
    limit: vi.fn(() => q),
    lean: vi.fn(async () => value)
  };
  return q;
};

describe("citizen dashboard service", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("rejects missing identity", async () => {
    await expect(getCitizenDashboard({})).rejects.toMatchObject({ statusCode: 401 });
  });

  it("rejects organization accounts", async () => {
    vi.spyOn(User, "findById").mockReturnValue(makeQuery({ _id: citizenId, role: "Organization", accountStatus: "Active" }));
    await expect(getCitizenDashboard({ userId: citizenId })).rejects.toThrow("Active Citizen account required");
  });

  it("returns scoped counts and empty activity for an active citizen", async () => {
    vi.spyOn(User, "findById").mockReturnValue(makeQuery({ _id: citizenId, role: "Citizen", accountStatus: "Active" }));
    vi.spyOn(Credential, "countDocuments").mockResolvedValue(0);
    vi.spyOn(CredentialShare, "countDocuments").mockResolvedValue(0);
    vi.spyOn(Credential, "find").mockImplementation(() => makeQuery([]));
    vi.spyOn(CredentialShare, "find").mockImplementation(() => makeQuery([]));
    vi.spyOn(Organization, "find").mockImplementation(() => makeQuery([]));

    const data = await getCitizenDashboard({ userId: citizenId });
    expect(data).toMatchObject({
      totalCredentials: 0, verifiedCredentials: 0, pendingCredentials: 0,
      rejectedCredentials: 0, revokedCredentials: 0, expiredCredentials: null,
      sharedCredentials: 0, activeShares: 0, recentActivity: [], recentShares: []
    });
    expect(Credential.countDocuments).toHaveBeenCalledWith({ citizenId });
    expect(CredentialShare.countDocuments).toHaveBeenCalledWith({ citizen: citizenId });
  });
});
