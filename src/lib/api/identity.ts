import type { SelfIdentity } from "./types";

function key(roomId: string): string {
  return `pp-self-${roomId}`;
}

export function saveSelf(identity: SelfIdentity): void {
  sessionStorage.setItem(key(identity.roomId), JSON.stringify(identity));
}

export function loadSelf(roomId: string): SelfIdentity | null {
  const raw = sessionStorage.getItem(key(roomId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SelfIdentity;
  } catch {
    return null;
  }
}
