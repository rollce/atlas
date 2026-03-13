type AttemptEntry = {
  attempts: number;
  firstAttemptAt: number;
  blockedUntil?: number;
};

const attemptsMap = new Map<string, AttemptEntry>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;

export function assertLoginAllowed(key: string): void {
  const entry = attemptsMap.get(key);
  if (!entry) {
    return;
  }

  const now = Date.now();
  if (entry.blockedUntil && entry.blockedUntil > now) {
    const retryAfterSec = Math.ceil((entry.blockedUntil - now) / 1000);
    const error = new Error(
      `Too many login attempts. Try again in ${retryAfterSec}s.`,
    );
    (error as Error & { statusCode: number }).statusCode = 429;
    throw error;
  }

  if (entry.firstAttemptAt + WINDOW_MS < now) {
    attemptsMap.delete(key);
  }
}

export function recordLoginFailure(key: string): void {
  const now = Date.now();
  const current = attemptsMap.get(key);

  if (!current || current.firstAttemptAt + WINDOW_MS < now) {
    attemptsMap.set(key, {
      attempts: 1,
      firstAttemptAt: now,
    });
    return;
  }

  const attempts = current.attempts + 1;
  attemptsMap.set(key, {
    ...current,
    attempts,
    blockedUntil:
      attempts >= MAX_ATTEMPTS ? now + BLOCK_MS : current.blockedUntil,
  });
}

export function clearLoginFailures(key: string): void {
  attemptsMap.delete(key);
}
