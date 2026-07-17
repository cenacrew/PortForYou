declare global {
  interface TenantUser {
    sub: string;
    email: string;
    role: string;
  }

  namespace Express {
    interface Request {
      user?: TenantUser;
      /** Identifiant de corrélation (trace Cloud Run ou UUID local). */
      requestId?: string;
    }
  }
}

export {};
