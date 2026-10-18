import type { IncomingMessage, ServerResponse } from 'http';
import { handleVercelServerless } from '../src/server/vercel-adapter';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  return handleVercelServerless(req, res);
}
