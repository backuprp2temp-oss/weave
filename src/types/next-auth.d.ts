import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      accessToken?: string;
      githubId?: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    accessToken?: string;
    githubId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    accessToken?: string;
    githubId?: string;
  }
}
