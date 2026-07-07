declare global {
  interface TenantUser {
    sub: string;
    email: string;
    role: string;
  }

  namespace Express {
    interface Request {
      user?: TenantUser;
    }
  }
}

export {};
