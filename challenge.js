/**
 * "Beat my run" challenges and live race invites.
 *
 * A finished heat is recorded as samples [t, d, x, y] every 0.2 s. Saving a
 * challenge stores that run with the exact course layout (room code + heat +
 * course seed), so the friend who opens the link races the same track against
 * the challenger's flight, replayed as a zappable opponent. Their result can be
 * sent straight back as a rematch.
 */

/** Interpolated position of a recorded run at time t (holds the final sample's pace afterwards). */
export function sampleRun(run, t) {
  if (!run?.length) return { d: 0, x: 0, y: 0 };
  if (t <= run[0][0]) return { d: run[0][1], x: run[0][2], y: run[0][3] };
  let lo = 0, hi = run.length - 1;
  if (t >= run[hi][0]) {
    const a = run[Math.max(0, hi - 1)], b = run[hi], pace = (b[1] - a[1]) / Math.max(0.01, b[0] - a[0]);
    return { d: b[1] + pace * (t - b[0]), x: b[2], y: b[3] };
  }
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (run[mid][0] <= t) lo = mid; else hi = mid; }
  const a = run[lo], b = run[hi], k = (t - a[0]) / Math.max(0.001, b[0] - a[0]);
  return { d: a[1] + (b[1] - a[1]) * k, x: a[2] + (b[2] - a[2]) * k, y: a[3] + (b[3] - a[3]) * k };
}

const base = () => `${location.origin}${location.pathname}`;
export const challengeLink = (id) => `${base()}?challenge=${id}`;
export const inviteLinkFor = (code, from) => `${base()}?room=${code}${from ? `&from=${encodeURIComponent(String(from).slice(0, 18))}` : ''}`;

/** Native share sheet on phones, clipboard elsewhere. Resolves to a short status string. */
export async function shareLink({ url, title = 'Starwake', text }) {
  try {
    if (navigator.share && matchMedia('(pointer:coarse)').matches) {
      await navigator.share({ title, text, url });
      return 'shared';
    }
    await navigator.clipboard.writeText(`${text} ${url}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}
