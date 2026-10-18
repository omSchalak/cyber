import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { handleApiRequest } from './src/server/router';

function apiDevServerPlugin(): Plugin {
  return {
    name: 'api-dev-server-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const rawUrl = req.url || '';
        if (!rawUrl.startsWith('/api')) {
          return next();
        }

        try {
          const parsedUrl = new URL(rawUrl, 'http://localhost');
          const pathname = parsedUrl.pathname;
          const query: Record<string, string> = {};
          parsedUrl.searchParams.forEach((val, key) => {
            query[key] = val;
          });

          let body: any = undefined;
          if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
            const chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
            }
            const rawBody = Buffer.concat(chunks).toString('utf8');
            if (rawBody.trim()) {
              try {
                body = JSON.parse(rawBody);
              } catch {
                body = { raw: rawBody };
              }
            } else {
              body = {};
            }
          }

          const response = await handleApiRequest(
            req.method || 'GET',
            pathname,
            query,
            body
          );

          res.statusCode = response.status;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          if (response.headers) {
            Object.entries(response.headers).forEach(([k, v]) => res.setHeader(k, v));
          }
          res.end(JSON.stringify(response.body));
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            error: {
              code: 'DEV_SERVER_API_ERROR',
              message: msg
            }
          }));
        }
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), apiDevServerPlugin()],
  server: {
    port: 5173,
    strictPort: false
  }
});
