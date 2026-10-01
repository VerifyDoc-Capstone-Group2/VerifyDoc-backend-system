import multer from "multer";
import { storage, imageFileFilter, documentFileFilter, registrationFileFilter } from "../config/multerConfig.js";


const uploadProfilePicture = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

const uploadDocument = multer({
  storage,
  fileFilter: documentFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

const uploadRegistrationFiles = multer({
  storage,
  fileFilter: registrationFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

export {
  uploadDocument,
  uploadProfilePicture,
  uploadRegistrationFiles
};