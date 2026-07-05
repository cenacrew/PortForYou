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
    }
  }
}

export {};
