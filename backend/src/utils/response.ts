import { Response } from 'express';

export const sendSuccess = (res: Response, data: unknown, statusCode = 200): void => {
  res.status(statusCode).json({ success: true, data });
};

export const sendCreated = (res: Response, data: unknown): void => {
  res.status(201).json({ success: true, data });
};

export const sendError = (res: Response, message: string, field = 'server', statusCode = 400): void => {
  res.status(statusCode).json({
    errors: [{ field, message }],
  });
};

export const sendPaginated = (
  res: Response,
  data: unknown[],
  total: number,
  page: number,
  limit: number
): void => {
  res.status(200).json({
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
};
