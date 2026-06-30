import { Request, Response, NextFunction } from 'express';

export function platformGuard(req: Request, res: Response, next: NextFunction) {
  const platform = req.header('X-Client-Platform');

  if (platform !== 'mobile' && platform !== 'web') {
    return res.status(400).json({ success: false, error: 'Missing or invalid X-Client-Platform header' });
  }

  if (platform === 'mobile' && req.user?.role === 'teacher') {
    return res.status(403).json({ success: false, error: 'Use the web dashboard' });
  }

  if (platform === 'web' && req.user?.role === 'student') {
    return res.status(403).json({ success: false, error: 'Use the mobile app' });
  }

  next();
}