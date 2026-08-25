import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";
import { ApiError } from "../plugins/error-handler.js";

export interface UploadSignatureResponse {
  signature: string;
  timestamp: number;
  folder: string;
  apiKey: string;
  cloudName: string;
  uploadUrl: string;
}

export interface DirectUploadResult {
  url: string;
  publicId: string;
}

export class StorageService {
  private isConfigured: boolean;

  constructor() {
    const cloudName = env.CLOUDINARY_CLOUD_NAME || "";
    const apiKey = env.CLOUDINARY_API_KEY || "";
    const apiSecret = env.CLOUDINARY_API_SECRET || "";

    this.isConfigured = Boolean(
      cloudName &&
      cloudName !== "your_cloud_name" &&
      apiKey &&
      apiKey !== "1234567890" &&
      apiSecret &&
      apiSecret !== "dev_secret_placeholder"
    );

    if (this.isConfigured) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
    }
  }

  /**
   * Generates a signed authorization payload for direct client-to-Cloudinary upload.
   */
  public getUploadSignature(): UploadSignatureResponse {
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = "wishlet/wishes";

    if (!this.isConfigured) {
      throw new ApiError(
        400,
        "STORAGE_NOT_CONFIGURED",
        "Cloudinary credentials are not configured or using placeholders. Set valid CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in backend/.env"
      );
    }

    const paramsToSign = {
      timestamp,
      folder,
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      env.CLOUDINARY_API_SECRET
    );

    return {
      signature,
      timestamp,
      folder,
      apiKey: env.CLOUDINARY_API_KEY,
      cloudName: env.CLOUDINARY_CLOUD_NAME,
      uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    };
  }

  /**
   * Direct server upload helper using Cloudinary stream with Data-URI fallback.
   */
  public async uploadImage(
    fileBuffer: Buffer,
    originalFilename: string,
    mimeType: string
  ): Promise<DirectUploadResult> {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedMimeTypes.includes(mimeType)) {
      throw new ApiError(
        415,
        "UNSUPPORTED_TYPE",
        "File type not allowed. Please upload JPEG, PNG, or WebP."
      );
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (fileBuffer.length > MAX_SIZE) {
      throw new ApiError(413, "FILE_TOO_LARGE", "File size exceeds the 10MB limit.");
    }

    // If Cloudinary credentials are not fully configured or using placeholders, use Data-URI preview fallback
    if (!this.isConfigured) {
      console.warn("Cloudinary not configured or using placeholder credentials. Using Data-URI preview fallback.");
      const base64Data = fileBuffer.toString("base64");
      return {
        url: `data:${mimeType};base64,${base64Data}`,
        publicId: `local_dev_${Date.now()}`,
      };
    }

    return new Promise<DirectUploadResult>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "wishlet/wishes",
          resource_type: "image",
        },
        (error, result) => {
          if (error || !result) {
            console.error("Cloudinary upload error details:", error);
            
            // Fallback to Data-URI preview in non-production or if Cloudinary rejects placeholder credentials
            const base64Data = fileBuffer.toString("base64");
            if (env.NODE_ENV !== "production" || error?.message?.includes("Invalid") || error?.message?.includes("Must supply")) {
              console.warn("Cloudinary API rejected request. Returning Data-URI fallback for local development preview.");
              return resolve({
                url: `data:${mimeType};base64,${base64Data}`,
                publicId: `local_dev_${Date.now()}`,
              });
            }

            const errorMsg = error?.message ? `Cloudinary error: ${error.message}` : "Failed to upload image to Cloudinary CDN.";
            return reject(new ApiError(500, "UPLOAD_FAILED", errorMsg));
          }

          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        }
      );

      uploadStream.end(fileBuffer);
    });
  }

  /**
   * Deletes a Cloudinary asset by its public_id.
   */
  public async deleteImage(publicId: string): Promise<boolean> {
    if (!publicId || !this.isConfigured || publicId.startsWith("local_dev_")) {
      return false;
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === "ok";
    } catch (error) {
      console.error("Failed to delete Cloudinary asset:", publicId, error);
      return false;
    }
  }
}

export const storageService = new StorageService();
