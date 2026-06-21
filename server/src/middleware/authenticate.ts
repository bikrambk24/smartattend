import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../services/token.service';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

// checks the Bearer token and attaches the decoded user to req.user
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }

  const token = header.split(' ')[1];

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}