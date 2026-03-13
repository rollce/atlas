import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import ms, { type StringValue } from "ms";
import { env } from "../../config/env.js";

type AccessClaims = {
  sub: string;
  sid: string;
  typ: "access";
};

type RefreshClaims = {
  sub: string;
  sid: string;
  typ: "refresh";
};

type TokenClaims = (AccessClaims | RefreshClaims) & JwtPayload;

function ttlToDate(ttl: string, fallbackMs: number): Date {
  const parsed = ms(ttl as StringValue);
  const duration = typeof parsed === "number" ? parsed : fallbackMs;
  return new Date(Date.now() + duration);
}

function sign(
  payload: AccessClaims | RefreshClaims,
  secret: string,
  expiresIn: string,
): string {
  return jwt.sign(payload, secret, {
    expiresIn: expiresIn as SignOptions["expiresIn"],
  });
}

function verify(token: string, secret: string): TokenClaims {
  const decoded = jwt.verify(token, secret);
  if (typeof decoded === "string") {
    throw new Error("Invalid token payload");
  }
  return decoded as TokenClaims;
}

export function signAccessToken(userId: string, sessionId: string): string {
  return sign(
    {
      sub: userId,
      sid: sessionId,
      typ: "access",
    },
    env.JWT_ACCESS_SECRET,
    env.ACCESS_TOKEN_TTL,
  );
}

export function signRefreshToken(userId: string, sessionId: string): string {
  return sign(
    {
      sub: userId,
      sid: sessionId,
      typ: "refresh",
    },
    env.JWT_REFRESH_SECRET,
    env.REFRESH_TOKEN_TTL,
  );
}

export function verifyAccessToken(token: string): AccessClaims & JwtPayload {
  const claims = verify(token, env.JWT_ACCESS_SECRET);
  if (
    claims.typ !== "access" ||
    typeof claims.sub !== "string" ||
    typeof claims.sid !== "string"
  ) {
    throw new Error("Invalid access token");
  }
  return claims as AccessClaims & JwtPayload;
}

export function verifyRefreshToken(token: string): RefreshClaims & JwtPayload {
  const claims = verify(token, env.JWT_REFRESH_SECRET);
  if (
    claims.typ !== "refresh" ||
    typeof claims.sub !== "string" ||
    typeof claims.sid !== "string"
  ) {
    throw new Error("Invalid refresh token");
  }
  return claims as RefreshClaims & JwtPayload;
}

export function getRefreshTokenExpiryDate(): Date {
  return ttlToDate(env.REFRESH_TOKEN_TTL, 30 * 24 * 60 * 60 * 1000);
}
