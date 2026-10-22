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
  /** Extra signed fields the client must append to the upload form verbatim. */
  params?: Record<string, string>;
}

export type UploadKind = "image" | "audio";
export type MediaResourceType = "image" | "video";

export const VOICE_FOLDER = "wishlet/voice";
export const PHOTO_FOLDER = "wishlet/wishes";
export const VOICE_FORMATS = ["webm", "ogg", "m4a", "mp4", "mp3", "aac", "wav", "opus"];

export interface VoiceAssetInfo {
  bytes: number;
  duration: number;
  format: string;
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
  public get configured(): boolean {
    return this.isConfigured;
  }

  public getUploadSignature(kind: UploadKind = "image"): UploadSignatureResponse {
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = kind === "audio" ? VOICE_FOLDER : PHOTO_FOLDER;

    if (!this.isConfigured) {
      throw new ApiError(
        400,
        "STORAGE_NOT_CONFIGURED",
        "Cloudinary credentials are not configured or using placeholders. Set valid CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in backend/.env"
      );
    }

    const allowedFormats = VOICE_FORMATS.join(",");
    const paramsToSign: Record<string, string | number> =
      kind === "audio" ? { timestamp, folder, allowed_formats: allowedFormats } : { timestamp, folder };

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
      uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/${
        kind === "audio" ? "video" : "image"
      }/upload`,
      ...(kind === "audio" ? { params: { allowed_formats: allowedFormats } } : {}),
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
   * Looks up an uploaded voice asset via the Admin API. Returns null if it doesn't exist
   * or Cloudinary isn't configured.
   */
  public async getVoiceAsset(publicId: string): Promise<VoiceAssetInfo | null> {
    if (!this.isConfigured) return null;
    try {
      const r = (await cloudinary.api.resource(publicId, { resource_type: "video" })) as {
        bytes?: number;
        duration?: number;
        format?: string;
      };
      if (typeof r.bytes !== "number" || typeof r.duration !== "number" || !r.format) return null;
      return { bytes: r.bytes, duration: r.duration, format: r.format };
    } catch (error) {
      console.error("Failed to look up voice asset:", publicId, error);
      return null;
    }
  }

  /**
   * Deletes a Cloudinary asset by its public_id.
   */
  public async deleteMedia(
    publicId: string,
    resourceType: MediaResourceType = "image",
  ): Promise<boolean> {
    if (!publicId || !this.isConfigured || publicId.startsWith("local_dev_")) {
      return false;
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
      return result.result === "ok";
    } catch (error) {
      console.error("Failed to delete Cloudinary asset:", publicId, error);
      return false;
    }
  }
}

export const storageService = new StorageService();
