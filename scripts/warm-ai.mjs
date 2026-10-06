/**
 * Pre-warm the AI rival lines for every built-in course on a deployment, so a judge's
 * very first race already has OpenAI-written taunts (they're cached per course).
 *   node scripts/warm-ai.mjs https://your-site.netlify.app
 */
import { COURSE_CATALOG } from '../course-catalog.js';

const base = (process.argv[2] || '').replace(/\/$/, '');
if (!base) { console.error('Usage: node scripts/warm-ai.mjs <site-url>'); process.exit(1); }
let last = null;
for (const c of COURSE_CATALOG) {
  const res = await fetch(`${base}/.netlify/functions/banter`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'cast', course: { id: c.id } }) });
  const data = await res.json().catch(() => ({}));
  const why = data.upstream ? ` (OpenAI said ${data.upstream}${data.upstreamCode ? ` ${data.upstreamCode}` : ''})` : '';
  console.log(`${c.id.padEnd(18)} ${res.status} ${data.cached ? 'cached' : data.cast ? 'generated' : (data.error || '') + why}`);
  last = data;
}
const HINTS = {
  401: 'The OpenAI key on Netlify is wrong or revoked. Make a new key, paste it into Netlify (OPENAI_API_KEY), then redeploy.',
  429: 'The OpenAI account has no credit or hit its limit. Add a few dollars of credit at platform.openai.com/settings/organization/billing.',
  403: 'The key or project is not allowed to use this model. Check the project limits/model access, or set OPENAI_MODEL on Netlify.',
  404: 'The model name is not available to this account. Set OPENAI_MODEL on Netlify to a model you can use.',
  400: 'OpenAI rejected the request format. Tell Claude the line above.',
  timeout: 'OpenAI took too long. Run this again in a minute.',
};
if (last?.upstream && HINTS[last.upstream]) console.log(`\n→ ${HINTS[last.upstream]}`);
