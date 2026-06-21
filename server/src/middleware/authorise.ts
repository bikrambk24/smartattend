import { Request, Response, NextFunction } from 'express';

// restricts a route to specific roles, use after authenticate
export function authorise(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Access denied for this role' });
    }
    next();
  };
}