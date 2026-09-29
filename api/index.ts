import { app, ensureInitialized } from '../server.js';

export default async function handler(req: any, res: any) {
  await ensureInitialized();
  return app(req, res);
}
