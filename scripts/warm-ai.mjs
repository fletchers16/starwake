/**
 * Pre-warm the AI rival lines for every built-in course on a deployment, so a judge's
 * very first race already has OpenAI-written taunts (they're cached per course).
 *   node scripts/warm-ai.mjs https://your-site.netlify.app
 */
import { COURSE_CATALOG } from '../course-catalog.js';

const base = (process.argv[2] || '').replace(/\/$/, '');
if (!base) { console.error('Usage: node scripts/warm-ai.mjs <site-url>'); process.exit(1); }
for (const c of COURSE_CATALOG) {
  const res = await fetch(`${base}/.netlify/functions/banter`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'cast', course: { id: c.id } }) });
  const data = await res.json().catch(() => ({}));
  console.log(`${c.id.padEnd(18)} ${res.status} ${data.cached ? 'cached' : data.cast ? 'generated' : data.error || ''}`);
}
