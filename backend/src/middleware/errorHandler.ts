import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('Unhandled error:', err.message);

  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  res.status(500).json({
    errors: [{ field: 'server', message: 'An internal server error occurred.' }],
  });
};

export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({
    errors: [{ field: 'route', message: 'The requested resource was not found.' }],
  });
};
