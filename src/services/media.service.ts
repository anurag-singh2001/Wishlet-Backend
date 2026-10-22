import { env } from "../config/env.js";
import { ApiError } from "../plugins/error-handler.js";
import { storageService, VOICE_FORMATS } from "./storage.service.js";

const PHOTO_PREFIX = "wishlet/wishes/";
const VOICE_PREFIX = "wishlet/voice/";
const MAX_VOICE_BYTES = 2 * 1024 * 1024;
const MAX_VOICE_SECONDS = 61;
const VOICE_KEYS = ["voiceUrl", "voicePublicId", "voiceDuration"];

export interface SanitizedMedia {
  content: Record<string, unknown>;
  photoUrl: string | null;
  photoPublicId: string | null;
}

function isOwnCloudinaryUrl(url: unknown, publicId: string): boolean {
  const cloud = env.CLOUDINARY_CLOUD_NAME;
  return (
    typeof url === "string" &&
    Boolean(cloud) &&
    url.startsWith(`https://res.cloudinary.com/${cloud}/`) &&
    url.includes(publicId)
  );
}

function invalidVoice(message: string): ApiError {
  return new ApiError(400, "INVALID_VOICE", message);
}

export class MediaService {
  /** Photo ids are only trusted when they sit in our folder and match the photo URL. */
  private safePhotoPublicId(
    content: Record<string, unknown>,
    photoUrl: string | null,
  ): string | null {
    const id = content["photoPublicId"];
    if (typeof id !== "string" || !id.startsWith(PHOTO_PREFIX)) return null;
    return isOwnCloudinaryUrl(photoUrl, id) ? id : null;
  }

  private async validateVoice(content: Record<string, unknown>): Promise<void> {
    const { voiceUrl, voicePublicId } = content;
    if (typeof voicePublicId !== "string" || !voicePublicId.startsWith(VOICE_PREFIX)) {
      throw invalidVoice("Invalid voice message.");
    }
    if (!isOwnCloudinaryUrl(voiceUrl, voicePublicId)) {
      throw invalidVoice("Invalid voice message.");
    }
    if (!storageService.configured) {
      throw new ApiError(400, "VOICE_UPLOAD_UNAVAILABLE", "Voice messages are not available.");
    }
    const asset = await storageService.getVoiceAsset(voicePublicId);
    if (!asset) throw invalidVoice("Voice message could not be verified.");
    if (asset.bytes > MAX_VOICE_BYTES) throw invalidVoice("Voice message is too large.");
    if (asset.duration > MAX_VOICE_SECONDS) throw invalidVoice("Voice message is too long.");
    if (!VOICE_FORMATS.includes(asset.format.toLowerCase())) {
      throw invalidVoice("Voice message format is not supported.");
    }
    content["voiceDuration"] = Math.round(asset.duration * 10) / 10;
  }

  /** Returns a cleaned copy of the content plus the trusted photo fields. */
  async sanitize(input: Record<string, unknown>): Promise<SanitizedMedia> {
    const content = { ...input };
    const photoUrl =
      typeof content["photoUrl"] === "string"
        ? content["photoUrl"]
        : Array.isArray(content["photos"]) && typeof content["photos"][0] === "string"
          ? content["photos"][0]
          : null;

    const photoPublicId = this.safePhotoPublicId(content, photoUrl);
    if (photoPublicId) content["photoPublicId"] = photoPublicId;
    else delete content["photoPublicId"];

    if (VOICE_KEYS.some((k) => content[k] !== undefined && content[k] !== null)) {
      await this.validateVoice(content);
    } else {
      delete content["voiceUrl"];
      delete content["voicePublicId"];
      delete content["voiceDuration"];
    }
    return { content, photoUrl, photoPublicId };
  }

  /** Content safe for the public GET: no asset ids. */
  stripPrivate(content: unknown): Record<string, unknown> {
    const copy = { ...((content ?? {}) as Record<string, unknown>) };
    delete copy["photoPublicId"];
    delete copy["voicePublicId"];
    return copy;
  }
}

export const mediaService = new MediaService();
