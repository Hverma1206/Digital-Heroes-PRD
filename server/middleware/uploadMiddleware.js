import fs from "fs";
import path from "path";
import multer from "multer";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.join(__dirname, "..", "uploads", "winner-proofs");

if (!fs.existsSync(uploadsRoot)) {
  fs.mkdirSync(uploadsRoot, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsRoot);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const safeExt = [".png", ".jpg", ".jpeg", ".webp", ".pdf"].includes(extension) ? extension : ".bin";
    cb(null, `proof_${Date.now()}_${Math.random().toString(36).slice(2, 10)}${safeExt}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    cb(new Error("Only PNG, JPG, WEBP, and PDF files are allowed"));
    return;
  }

  cb(null, true);
};

const proofUpload = multer({
  storage,
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
  fileFilter,
});

export default {
  proofUpload,
};
