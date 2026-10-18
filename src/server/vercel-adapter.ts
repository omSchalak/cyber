import type { IncomingMessage, ServerResponse } from 'http';
import { handleApiRequest } from './router';

export async function handleVercelServerless(req: IncomingMessage & { body?: any; query?: any }, res: ServerResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    const rawUrl = req.url || '/api/health';
    const parsedUrl = new URL(rawUrl, 'http://localhost');
    const pathname = parsedUrl.pathname;

    const query: Record<string, string> = {};
    parsedUrl.searchParams.forEach((val, key) => {
      query[key] = val;
    });

    // Parse body if not already parsed
    let body = req.body;
    if (body === undefined && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      const rawText = Buffer.concat(chunks).toString('utf8');
      if (rawText.trim()) {
        try {
          body = JSON.parse(rawText);
        } catch {
          body = { raw: rawText };
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
        code: 'SERVERLESS_INVOCATION_ERROR',
        message: msg
      }
    }));
  }
}
