let accessToken: string | null = null;

const authFailureListeners = new Set<() => void>();

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function subscribeToAuthFailure(listener: () => void): () => void {
  authFailureListeners.add(listener);

  return () => {
    authFailureListeners.delete(listener);
  };
}

export function notifyAuthFailure(requestToken: string | null): void {
  // Ignore anonymous requests and responses from
  // a session that has already changed.
  if (!requestToken || requestToken !== accessToken) {
    return;
  }

  authFailureListeners.forEach((listener) => listener());
}
