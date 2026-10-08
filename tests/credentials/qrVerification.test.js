import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../app.js";
import { Credential } from "../../models/credentialModel.js";
import { createVerificationToken } from "../../services/credentialVerificationService.js";
import { generateCredentialQRCode } from "../../services/credentialQRCodeService.js";

vi.mock("../../models/credentialModel.js", () => ({
  Credential: { findOne: vi.fn() }
}));

describe("QR verification", () => {
  beforeEach(() => vi.clearAllMocks());

  it("generates a QR image and signed URL", async () => {
    const result = await generateCredentialQRCode("VDOC-CRED-12345678");
    expect(result.verificationUrl).toContain("/verify/VDOC-CRED-12345678");
    expect(result.verificationUrl).toContain("token=");
    expect(result.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it("returns safe verified credential details", async () => {
    Credential.findOne.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        credentialId: "VDOC-CRED-12345678",
        issuerName: "Sample Institution",
        title: "Degree",
        credentialType: "Degree",
        issueDate: new Date("2024-01-01"),
        verificationStatus: "Verified",
        status: "Active",
        source: "Institution",
        document: { url: "private-url", publicId: "private-id" }
      })
    });
    const token = createVerificationToken("VDOC-CRED-12345678");
    const response = await request(app).get("/credentials/verify/VDOC-CRED-12345678").query({ token });
    expect(response.status).toBe(200);
    expect(response.body.data.isValid).toBe(true);
    expect(response.body.data).not.toHaveProperty("document");
    expect(response.body.data).not.toHaveProperty("citizenId");
  });

  it("rejects invalid verification tokens", async () => {
    const response = await request(app).get("/credentials/verify/VDOC-CRED-12345678").query({ token: "0".repeat(64) });
    expect(response.status).toBe(403);
    expect(Credential.findOne).not.toHaveBeenCalled();
  });

  it("reports revoked credentials as invalid", async () => {
    Credential.findOne.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        credentialId: "VDOC-CRED-12345678",
        issuerName: "Sample Institution",
        title: "Degree",
        credentialType: "Degree",
        verificationStatus: "Verified",
        status: "Revoked",
        revokedAt: new Date("2026-01-01")
      })
    });
    const token = createVerificationToken("VDOC-CRED-12345678");
    const response = await request(app).get("/credentials/verify/VDOC-CRED-12345678").query({ token });
    expect(response.status).toBe(200);
    expect(response.body.data.isValid).toBe(false);
    expect(response.body.data.status).toBe("Revoked");
  });
});
