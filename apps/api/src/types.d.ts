interface AuthedUser {
  uid: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  admin: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthedUser;
      /** Identifiant de corrélation (trace Cloud Run ou UUID local). */
      requestId?: string;
    }
  }
}

export {};
