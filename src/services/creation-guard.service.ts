import { TEMPLATES } from "../config/catalog.js";
import { ApiError } from "../plugins/error-handler.js";
import { adminAuthService } from "./admin-auth.service.js";
import { siteConfigService } from "./site-config.service.js";

export class CreationGuardService {
  /** Blocked users get 403; disabled or out-of-season occasions/templates get 400 UNAVAILABLE. */
  async assertCanCreate(userId: string, templateId: string, occasion: string): Promise<void> {
    await adminAuthService.assertNotBlocked(userId);
    const { occasions, templates } = await siteConfigService.getPublicConfig(new Date());
    const known = TEMPLATES.some((t) => t.id === templateId);
    const templateOk = templates.some((t) => t.id === templateId && t.occasion === occasion);
    // Unknown (frontend-only) ids pass through as before; only admin-controlled ones are gated.
    const occasionOk = occasions.some((o) => o.id === occasion);
    const occasionKnown = TEMPLATES.some((t) => t.occasion === occasion);
    if ((known && !templateOk) || (occasionKnown && !occasionOk)) {
      throw new ApiError(400, "UNAVAILABLE", "This occasion or template is not available.");
    }
  }
}

export const creationGuardService = new CreationGuardService();
