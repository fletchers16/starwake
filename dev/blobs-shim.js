// In-memory stand-in for @netlify/blobs used by the Vite dev server, so the
// real Netlify functions run locally. Supports the subset Starwake uses.
const stores = globalThis.__starwakeBlobStores || (globalThis.__starwakeBlobStores = new Map());
let tick = 0;

export function getStore({ name } = {}) {
  if (!stores.has(name)) stores.set(name, new Map());
  const data = stores.get(name);
  return {
    async getWithMetadata(key) {
      const entry = data.get(key);
      return entry ? { data: structuredClone(entry.value), etag: entry.etag, metadata: {} } : null;
    },
    async get(key) {
      const entry = data.get(key);
      return entry ? structuredClone(entry.value) : null;
    },
    async setJSON(key, value, { onlyIfMatch, onlyIfNew } = {}) {
      const existing = data.get(key);
      if (onlyIfNew && existing) return { modified: false };
      if (onlyIfMatch && existing?.etag !== onlyIfMatch) return { modified: false };
      const etag = `"${++tick}"`;
      data.set(key, { value: structuredClone(value), etag });
      return { modified: true, etag };
    },
    async delete(key) { data.delete(key); },
    async list({ prefix = '' } = {}) {
      return { blobs: [...data.keys()].filter((key) => key.startsWith(prefix)).map((key) => ({ key, etag: data.get(key).etag })) };
    },
  };
}
