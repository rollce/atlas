"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ApiError, apiRequest, type RequestOptions } from "./api";
import type {
  AtlasRole,
  OrganizationSummary,
  SessionTokens,
  UserSummary,
} from "./types";

type AuthStatus = "loading" | "authenticated" | "anonymous";

type StoredSession = {
  tokens: SessionTokens;
  user: UserSummary;
  organizations: OrganizationSummary[];
  activeOrganizationId: string | null;
};

type AuthedRequestOptions = RequestOptions & {
  tenant?: boolean;
};

type AuthContextValue = {
  status: AuthStatus;
  user: UserSummary | null;
  organizations: OrganizationSummary[];
  activeOrganizationId: string | null;
  activeRole: AtlasRole | null;
  tokens: SessionTokens | null;
  completeAuthSession: (params: {
    user: UserSummary;
    tokens: SessionTokens;
    organizations: OrganizationSummary[];
    activeOrganizationId?: string | null;
  }) => void;
  updateUserProfile: (user: UserSummary) => void;
  setActiveOrganization: (organizationId: string) => void;
  request: <T>(path: string, options?: AuthedRequestOptions) => Promise<T>;
  reloadOrganizations: () => Promise<void>;
  logout: () => Promise<void>;
};

const STORAGE_KEY = "atlas.auth.v1";
const SESSION_COOKIE_NAME = "atlas_session";
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

const AuthContext = createContext<AuthContextValue | null>(null);

function writeSessionCookie(sessionId: string | null) {
  if (typeof document === "undefined") {
    return;
  }

  if (!sessionId) {
    document.cookie = `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
    return;
  }

  document.cookie = `${SESSION_COOKIE_NAME}=${sessionId}; Path=/; Max-Age=${SESSION_COOKIE_MAX_AGE}; SameSite=Lax`;
}

function loadStoredSession(): StoredSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as StoredSession;
    if (
      !parsed.tokens?.accessToken ||
      !parsed.tokens?.refreshToken ||
      !parsed.tokens?.sessionId
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function persistSession(value: StoredSession | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!value) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

function getDefaultOrganizationId(
  organizations: OrganizationSummary[],
  preferredOrganizationId?: string | null,
): string | null {
  if (preferredOrganizationId) {
    const exists = organizations.some(
      (item) => item.id === preferredOrganizationId,
    );
    if (exists) {
      return preferredOrganizationId;
    }
  }

  return organizations[0]?.id ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<StoredSession | null>(null);

  const applySession = useCallback((nextSession: StoredSession | null) => {
    setSession(nextSession);
    persistSession(nextSession);
    writeSessionCookie(nextSession?.tokens.sessionId ?? null);
    setStatus(nextSession ? "authenticated" : "anonymous");
  }, []);

  const refreshTokens = useCallback(async (refreshToken: string) => {
    const payload = await apiRequest<{ tokens: SessionTokens }>(
      "/auth/refresh",
      {
        method: "POST",
        body: { refreshToken },
      },
    );
    return payload.tokens;
  }, []);

  const fetchOrganizations = useCallback(async (accessToken: string) => {
    const payload = await apiRequest<{ organizations: OrganizationSummary[] }>(
      "/organizations",
      { token: accessToken },
    );
    return payload.organizations;
  }, []);

  const withRefreshRetry = useCallback(
    async <T,>(task: (tokens: SessionTokens) => Promise<T>): Promise<T> => {
      if (!session) {
        throw new Error("Authentication session is missing");
      }

      try {
        return await task(session.tokens);
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
          throw error;
        }

        const nextTokens = await refreshTokens(session.tokens.refreshToken);
        const nextSession: StoredSession = {
          ...session,
          tokens: nextTokens,
        };

        applySession(nextSession);
        return task(nextTokens);
      }
    },
    [applySession, refreshTokens, session],
  );

  const reloadOrganizations = useCallback(async () => {
    if (!session) {
      return;
    }

    const organizations = await withRefreshRetry((tokens) =>
      fetchOrganizations(tokens.accessToken),
    );

    const activeOrganizationId = getDefaultOrganizationId(
      organizations,
      session.activeOrganizationId,
    );

    applySession({
      ...session,
      organizations,
      activeOrganizationId,
    });
  }, [applySession, fetchOrganizations, session, withRefreshRetry]);

  const completeAuthSession = useCallback(
    (params: {
      user: UserSummary;
      tokens: SessionTokens;
      organizations: OrganizationSummary[];
      activeOrganizationId?: string | null;
    }) => {
      const activeOrganizationId = getDefaultOrganizationId(
        params.organizations,
        params.activeOrganizationId,
      );

      applySession({
        user: params.user,
        tokens: params.tokens,
        organizations: params.organizations,
        activeOrganizationId,
      });
    },
    [applySession],
  );

  const updateUserProfile = useCallback(
    (user: UserSummary) => {
      if (!session) {
        return;
      }

      applySession({
        ...session,
        user: {
          ...session.user,
          ...user,
        },
      });
    },
    [applySession, session],
  );

  const setActiveOrganization = useCallback(
    (organizationId: string) => {
      if (!session) {
        return;
      }

      const exists = session.organizations.some(
        (item) => item.id === organizationId,
      );
      if (!exists) {
        return;
      }

      applySession({
        ...session,
        activeOrganizationId: organizationId,
      });
    },
    [applySession, session],
  );

  const logout = useCallback(async () => {
    if (session) {
      try {
        await apiRequest("/auth/logout", {
          method: "POST",
          body: {
            sessionId: session.tokens.sessionId,
            refreshToken: session.tokens.refreshToken,
          },
        });
      } catch {
        // Keep logout idempotent on client side as well.
      }
    }

    applySession(null);
  }, [applySession, session]);

  const request = useCallback(
    async <T,>(
      path: string,
      options: AuthedRequestOptions = {},
    ): Promise<T> => {
      if (!session) {
        throw new Error("Authentication session is missing");
      }

      return withRefreshRetry((tokens) =>
        apiRequest<T>(path, {
          ...options,
          token: tokens.accessToken,
          organizationId:
            options.organizationId ??
            (options.tenant
              ? (session.activeOrganizationId ?? undefined)
              : undefined),
        }),
      );
    },
    [session, withRefreshRetry],
  );

  useEffect(() => {
    const init = async () => {
      const stored = loadStoredSession();
      if (!stored) {
        setStatus("anonymous");
        return;
      }

      setSession(stored);

      try {
        const organizations = await fetchOrganizations(
          stored.tokens.accessToken,
        );
        const activeOrganizationId = getDefaultOrganizationId(
          organizations,
          stored.activeOrganizationId,
        );

        applySession({
          ...stored,
          organizations,
          activeOrganizationId,
        });
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
          applySession(null);
          return;
        }

        try {
          const nextTokens = await refreshTokens(stored.tokens.refreshToken);
          const organizations = await fetchOrganizations(
            nextTokens.accessToken,
          );
          const activeOrganizationId = getDefaultOrganizationId(
            organizations,
            stored.activeOrganizationId,
          );

          applySession({
            ...stored,
            tokens: nextTokens,
            organizations,
            activeOrganizationId,
          });
        } catch {
          applySession(null);
        }
      }
    };

    void init();
  }, [applySession, fetchOrganizations, refreshTokens]);

  const activeRole = useMemo(() => {
    if (!session?.activeOrganizationId) {
      return null;
    }

    return (
      session.organizations.find(
        (item) => item.id === session.activeOrganizationId,
      )?.role ?? null
    );
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user: session?.user ?? null,
      organizations: session?.organizations ?? [],
      activeOrganizationId: session?.activeOrganizationId ?? null,
      activeRole,
      tokens: session?.tokens ?? null,
      completeAuthSession,
      updateUserProfile,
      setActiveOrganization,
      request,
      reloadOrganizations,
      logout,
    }),
    [
      activeRole,
      completeAuthSession,
      logout,
      reloadOrganizations,
      request,
      session,
      setActiveOrganization,
      status,
      updateUserProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
