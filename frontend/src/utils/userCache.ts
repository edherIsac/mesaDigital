import { fetchUserById } from '../pages/Admin/Users/User.service';

const cache = new Map<string, string>();

/**
 * Resolve multiple user ids to display names (cached).
 * Returns an object mapping id -> name (or id when not resolvable).
 */
export async function resolveUserNames(ids: Array<string | undefined | null>): Promise<Record<string, string>> {
  const unique: string[] = [];
  for (const id of ids) {
    if (!id) continue;
    const sid = String(id);
    if (!cache.has(sid) && !unique.includes(sid)) unique.push(sid);
  }

  if (unique.length > 0) {
    await Promise.all(unique.map(async (uid) => {
      try {
        const u = await fetchUserById(uid);
        const name = (u && (u.name || u.email)) ? (u.name || u.email) : uid;
        cache.set(uid, name);
      } catch (e) {
        cache.set(uid, uid);
      }
    }));
  }

  const out: Record<string, string> = {};
  for (const id of ids) {
    if (!id) continue;
    const sid = String(id);
    out[sid] = cache.get(sid) ?? sid;
  }
  return out;
}

export function getCachedUserName(id?: string | null) {
  if (!id) return undefined;
  return cache.get(String(id));
}

export default { resolveUserNames, getCachedUserName };
