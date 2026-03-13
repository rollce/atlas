export const atlasRoles = ["OWNER", "ADMIN", "MANAGER", "MEMBER"] as const;

export type AtlasRole = (typeof atlasRoles)[number];

export type UserSummary = {
  id: string;
  email: string;
  fullName: string;
  emailVerified?: string | Date | null;
};

export type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
  role: AtlasRole;
};

export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
};
