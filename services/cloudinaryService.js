import cloudinary from "../config/cloudinaryConfig.js";
import { AppError } from "../errors/AppError.js";


export const uploadToCloudinary = (buffer, options) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) {
          reject(new AppError('File upload failed', 500));
          return;
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id
        });
      }
    );

    stream.end(buffer);
  });
};


export const deleteFromCloudinary = (publicId, options = {}) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(
      publicId,
      options,
      (error, result) => {
        if (error) {
          reject(new AppError('File deletion failed', 500));
          return;
        }

        resolve(result);
      }
    );
  });
};