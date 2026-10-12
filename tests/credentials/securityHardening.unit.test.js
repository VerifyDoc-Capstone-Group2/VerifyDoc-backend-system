import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

vi.mock("../../models/userModel.js", () => ({ User: { findById: vi.fn() } }));
import { User } from "../../models/userModel.js";
import { authValidation, requireActiveAccount } from "../../middlewares/authMiddleware.js";
import { errorHandler } from "../../middlewares/errorHandler.js";
import express from "express";

const id = new mongoose.Types.ObjectId().toString();
const secret = "security-test-only-secret";
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));
app.get("/protected", authValidation(), requireActiveAccount(), (req, res) => res.json({ role: req.user.role }));
app.post("/json", (_req, res) => res.json({ ok: true }));
app.get("/unexpected", () => { throw new Error("secret-internal-stack-data"); });
app.use(errorHandler);

describe("Security hardening", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.JWT_SECRET = secret;
    User.findById.mockResolvedValue({ _id: id, role: "Citizen", accountStatus: "Active" });
  });

  it("requires an Authorization header", async () => {
    expect((await request(app).get("/protected")).status).toBe(401);
  });

  it.each(["Basic abc", "Bearer", "Bearer one two", "Bearer  token"])("rejects malformed authorization: %s", async header => {
    expect((await request(app).get("/protected").set("Authorization", header)).status).toBe(401);
  });

  it("rejects JWTs signed with an unexpected algorithm", async () => {
    const token = jwt.sign({ userId: id }, secret, { algorithm: "HS384" });
    expect((await request(app).get("/protected").set("Authorization", `Bearer ${token}`)).status).toBe(401);
  });

  it("rejects JWTs without a valid user ID", async () => {
    const token = jwt.sign({ userId: "not-an-id" }, secret);
    expect((await request(app).get("/protected").set("Authorization", `Bearer ${token}`)).status).toBe(401);
  });

  it("uses the database role rather than a stale token role", async () => {
    const token = jwt.sign({ userId: id, role: "Admin" }, secret);
    const res = await request(app).get("/protected").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.role).toBe("Citizen");
  });

  it("blocks deactivated users with otherwise valid tokens", async () => {
    User.findById.mockResolvedValue({ _id: id, role: "Citizen", accountStatus: "Rejected" });
    const token = jwt.sign({ userId: id }, secret);
    expect((await request(app).get("/protected").set("Authorization", `Bearer ${token}`)).status).toBe(403);
  });

  it("rejects malformed JSON without leaking parser details", async () => {
    const res = await request(app).post("/json").set("Content-Type", "application/json").send('{"oops":');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Malformed JSON request body");
  });

  it("rejects oversized JSON bodies", async () => {
    const res = await request(app).post("/json").send({ payload: "x".repeat(120000) });
    expect(res.status).toBe(413);
  });

  it("hides internal exception messages and framework header", async () => {
    const res = await request(app).get("/unexpected");
    expect(res.status).toBe(500);
    expect(res.text).not.toContain("secret-internal-stack-data");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});
