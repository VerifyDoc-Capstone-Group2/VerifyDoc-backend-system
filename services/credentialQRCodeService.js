import QRCode from "qrcode";
import { AppError } from "../errors/AppError.js";
import { createVerificationToken } from "./credentialVerificationService.js";

export const generateCredentialQRCode = async (credentialId) => {
  if (typeof credentialId !== "string" || !/^VDOC-CRED-[0-9]{8}$/.test(credentialId)) {
    throw new AppError("Invalid credential ID", 400);
  }
  const base = process.env.FRONTEND_URL;
  if (!base) throw new AppError("FRONTEND_URL is not configured", 503);
  let url;
  try {
    url = new URL(base);
  } catch {
    throw new AppError("Invalid FRONTEND_URL", 503);
  }
  if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) {
    throw new AppError("FRONTEND_URL must use HTTPS", 503);
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new AppError("FRONTEND_URL must be a clean base URL", 503);
  }
  const basePath = url.pathname.replace(/\/$/, "");
  url.pathname = `${basePath}/verify/${encodeURIComponent(credentialId)}`;
  url.searchParams.set("token", createVerificationToken(credentialId));
  const verificationUrl = url.toString();
  const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, { errorCorrectionLevel: "M", margin: 2, width: 300 });
  return { credentialId, verificationUrl, qrCodeDataUrl };
};
