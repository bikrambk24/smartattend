import { Response } from 'express';

export function sendSuccess(res: Response, data: unknown, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

export function sendError(res: Response, message: string, statusCode = 400) {
  return res.status(statusCode).json({ success: false, error: message });
}