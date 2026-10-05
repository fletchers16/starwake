import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// In dev, serve /.netlify/functions/<name> by running the real function code
// (netlify/functions/<name>.ts) with an in-memory Blobs store. Production uses
// Netlify's own function runtime; this plugin is dev-only.
function netlifyFunctionsDev() {
  return {
    name: 'starwake-netlify-functions-dev',
    apply: 'serve',
    configureServer(server) {
      // Dev-only: save a captured image (e.g. the submission cover) into submission/.
      server.middlewares.use('/__dev/save-image', async (req, res) => {
        const name = new URL(req.url, 'http://x').searchParams.get('name') || '';
        if (req.method !== 'POST' || !/^[a-z0-9-]+\.png$/.test(name)) { res.statusCode = 400; return res.end('bad request'); }
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const base64 = Buffer.concat(chunks).toString().replace(/^data:image\/png;base64,/, '');
        const { mkdir, writeFile } = await import('node:fs/promises');
        const dir = fileURLToPath(new URL('./submission/', import.meta.url));
        await mkdir(dir, { recursive: true });
        await writeFile(dir + name, Buffer.from(base64, 'base64'));
        res.end('saved');
      });
      server.middlewares.use(async (req, res, next) => {
        const match = req.url?.match(/^\/\.netlify\/functions\/([a-z0-9-]+)(\?.*)?$/);
        if (!match) return next();
        try {
          const mod = await server.ssrLoadModule(`/netlify/functions/${match[1]}.ts`);
          const chunks = [];
          for await (const chunk of req) chunks.push(chunk);
          const body = chunks.length ? Buffer.concat(chunks) : undefined;
          const request = new Request(`http://${req.headers.host}${req.url}`, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body });
          const response = await mod.default(request);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (error) {
          if (/Failed to load|does not exist/i.test(String(error?.message))) return next();
          console.error('[netlify-functions-dev]', error);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Dev function crashed.' }));
        }
      });
    },
  };
}

export default defineConfig(({ command }) => ({
  plugins: [netlifyFunctionsDev()],
  resolve: command === 'serve' ? { alias: { '@netlify/blobs': fileURLToPath(new URL('./dev/blobs-shim.js', import.meta.url)) } } : {},
  ssr: { noExternal: command === 'serve' ? ['@netlify/blobs'] : [] },
  // three.js ships as its own long-cached chunk (~810 kB, the whole library is imported); the game code stays small.
  build: { rollupOptions: { output: { manualChunks: (id) => (id.includes('node_modules/three') ? 'three' : undefined) } }, chunkSizeWarningLimit: 900 },
}));
