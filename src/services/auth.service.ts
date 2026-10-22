import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env.js";
import { ApiError } from "../plugins/error-handler.js";
import { userRepository } from "../repositories/user.repository.js";
import { signSessionToken } from "../utils/session-token.js";

export interface PublicUser {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
}

export interface GoogleIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
}

export function toPublicUser(u: PublicUser): PublicUser {
  return { id: u.id, name: u.name, email: u.email, avatarUrl: u.avatarUrl };
}

const googleClient = new OAuth2Client();

export class AuthService {
  /** Verifies a Google ID token. Replaced in tests. */
  async verifyGoogleToken(idToken: string): Promise<GoogleIdentity | null> {
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: env.GOOGLE_CLIENT_ID,
      });
      const p = ticket.getPayload();
      if (!p?.sub || !p.email) return null;
      return {
        sub: p.sub,
        email: p.email,
        emailVerified: p.email_verified === true,
        name: p.name ?? null,
        picture: p.picture ?? null,
      };
    } catch {
      return null;
    }
  }

  async signInWithGoogle(credential: string): Promise<{ token: string; user: PublicUser }> {
    const identity = await this.verifyGoogleToken(credential);
    if (!identity || !identity.emailVerified) {
      throw new ApiError(401, "INVALID_GOOGLE_TOKEN", "Google sign-in could not be verified.");
    }
    const user = await userRepository.upsertByGoogleSub({
      googleSub: identity.sub,
      email: identity.email,
      name: identity.name,
      avatarUrl: identity.picture,
    });
    return { token: await signSessionToken(user.id), user: toPublicUser(user) };
  }

  async getUser(id: string): Promise<PublicUser> {
    const user = await userRepository.findById(id);
    if (!user) throw new ApiError(401, "UNAUTHORIZED", "Sign in required.");
    return toPublicUser(user);
  }
}

export const authService = new AuthService();
