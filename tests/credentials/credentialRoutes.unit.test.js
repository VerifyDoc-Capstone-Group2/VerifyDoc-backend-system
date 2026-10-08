import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../../middlewares/authMiddleware.js", () => ({
  authValidation: () => (req, _res, next) => {
    if (!req.headers.authorization) return _res.status(401).json({ message: "Authentication token required" });
    req.user = { userId: "507f1f77bcf86cd799439011" };
    next();
  },
  requireActiveAccount: () => (_req, _res, next) => next(),
  authorizeAdminRoles: () => (_req, _res, next) => next()
}));

vi.mock("../../services/credentialService.js", () => ({
  createCredential: vi.fn(),
  getCredentialById: vi.fn(),
  getCitizenCredentials: vi.fn(),
  getInstitutionCredentials: vi.fn(),
  verifyCredential: vi.fn(),
  rejectCredential: vi.fn(),
  revokeCredential: vi.fn()
}));
vi.mock("../../services/cloudinaryService.js", () => ({
  uploadToCloudinary: vi.fn(),
  deleteFromCloudinary: vi.fn()
}));
vi.mock("../../models/credentialModel.js", () => ({
  Credential: { findOne: vi.fn() }
}));
vi.mock("../../models/userModel.js", () => ({
  User: { findById: vi.fn() }
}));
vi.mock("../../models/institutionModel.js", () => ({
  Institution: { findOne: vi.fn() }
}));

import app from "../../app.js";
import * as service from "../../services/credentialService.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../../services/cloudinaryService.js";

const auth = (req) => req.set("Authorization", "Bearer mock");
const id = "VDOC-CRED-12345678";

describe("Credential management HTTP endpoints", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("rejects unauthenticated requests", async () => {
    const res = await request(app).get("/credentials/wallet");
    expect(res.status).toBe(401);
    expect(service.getCitizenCredentials).not.toHaveBeenCalled();
  });

  it("rejects creation without a PDF", async () => {
    const res = await auth(request(app).post("/credentials")).field("title", "Degree");
    expect(res.status).toBe(400);
    expect(uploadToCloudinary).not.toHaveBeenCalled();
  });

  it("rejects unsupported file field names", async () => {
    const res = await auth(request(app).post("/credentials"))
      .attach("certificate", Buffer.from("%PDF-1.4"), { filename: "test.pdf", contentType: "application/pdf" });
    expect(res.status).toBe(500);
    expect(service.createCredential).not.toHaveBeenCalled();
  });

  it("creates a credential with an uploaded PDF", async () => {
    uploadToCloudinary.mockResolvedValue({ url: "https://example.com/file.pdf", publicId: "file-id" });
    service.createCredential.mockResolvedValue({ credentialId: id });
    const res = await auth(request(app).post("/credentials"))
      .field("title", "Degree")
      .field("credentialType", "Certificate")
      .field("issueDate", "2025-01-01")
      .attach("document", Buffer.from("%PDF-1.4 test"), { filename: "test.pdf", contentType: "application/pdf" });
    expect(res.status).toBe(201);
    expect(service.createCredential).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Degree", document: { url: "https://example.com/file.pdf", publicId: "file-id" } }),
      expect.objectContaining({ userId: expect.any(String) })
    );
  });

  it("cleans up Cloudinary upload when service creation fails", async () => {
    uploadToCloudinary.mockResolvedValue({ url: "https://example.com/file.pdf", publicId: "file-id" });
    service.createCredential.mockRejectedValue(Object.assign(new Error("Invalid citizen ID"), { statusCode: 400 }));
    deleteFromCloudinary.mockResolvedValue({});
    const res = await auth(request(app).post("/credentials"))
      .attach("document", Buffer.from("%PDF-1.4 test"), { filename: "test.pdf", contentType: "application/pdf" });
    expect(res.status).toBe(400);
    expect(deleteFromCloudinary).toHaveBeenCalledWith("file-id", { resource_type: "raw" });
  });

  it("lists Citizen wallet credentials", async () => {
    service.getCitizenCredentials.mockResolvedValue({ credentials: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });
    const res = await auth(request(app).get("/credentials/wallet?page=1&limit=10"));
    expect(res.status).toBe(200);
    expect(service.getCitizenCredentials).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ page: "1", limit: "10" }));
  });

  it("lists Institution credentials", async () => {
    service.getInstitutionCredentials.mockResolvedValue({ credentials: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });
    const res = await auth(request(app).get("/credentials/institution?view=pendingReview"));
    expect(res.status).toBe(200);
    expect(service.getInstitutionCredentials).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ view: "pendingReview" }));
  });

  it("retrieves one credential", async () => {
    service.getCredentialById.mockResolvedValue({ credentialId: id });
    const res = await auth(request(app).get("/credentials/" + id));
    expect(res.status).toBe(200);
    expect(service.getCredentialById).toHaveBeenCalledWith(id, expect.any(Object));
  });

  it("verifies a credential", async () => {
    service.verifyCredential.mockResolvedValue({ credentialId: id, verificationStatus: "Verified" });
    const res = await auth(request(app).patch("/credentials/" + id + "/verify"));
    expect(res.status).toBe(200);
    expect(service.verifyCredential).toHaveBeenCalledWith(id, expect.any(Object));
  });

  it("rejects a credential with a reason", async () => {
    service.rejectCredential.mockResolvedValue({ credentialId: id, verificationStatus: "Rejected" });
    const res = await auth(request(app).patch("/credentials/" + id + "/reject")).send({ rejectionReason: "Incorrect record" });
    expect(res.status).toBe(200);
    expect(service.rejectCredential).toHaveBeenCalledWith(id, "Incorrect record", expect.any(Object));
  });

  it("revokes a credential with a reason", async () => {
    service.revokeCredential.mockResolvedValue({ credentialId: id, status: "Revoked" });
    const res = await auth(request(app).patch("/credentials/" + id + "/revoke")).send({ revocationReason: "Issued in error" });
    expect(res.status).toBe(200);
    expect(service.revokeCredential).toHaveBeenCalledWith(id, "Issued in error", expect.any(Object));
  });
});
