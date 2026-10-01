import multer from "multer";

const storage = multer.memoryStorage();

const imageFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP image format are allowed'), false);
  }
};

const documentFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/pdf'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error('Only PDF documents are allowed'),
      false
    );
  };
};


const registrationFileFilter = (req, file, cb) => {
  const imageMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp'
  ];

  if (file.fieldname === 'profilePicture') {
    if (imageMimeTypes.includes(file.mimetype)) {
      return cb(null, true);
    }

    return cb(
      new Error('Profile picture must be JPEG, PNG, or WebP'),
      false
    );
  }

  if (
    file.fieldname === 'cacCertificate' ||
    file.fieldname === 'accreditationDocument'
  ) {
    if (file.mimetype === 'application/pdf') {
      return cb(null, true);
    }

    return cb(
      new Error('Verification documents must be PDF'),
      false
    );
  }

  cb(new Error('Unexpected upload field'), false);
};

export { storage, imageFileFilter, documentFileFilter, registrationFileFilter };