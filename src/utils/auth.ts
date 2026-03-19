import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

export const requireInternalApiKey = (req: Request, res: Response, next: NextFunction) => {
  if (!env.withdrawSignerApiKey) {
    next();
    return;
  }

  const provided = req.header('x-internal-api-key') ?? req.header('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (provided !== env.withdrawSignerApiKey) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'withdraw signer api key is required' } });
    return;
  }

  next();
};
