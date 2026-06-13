import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

export const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: 'param' in err ? err.param : 'unknown',
      message: err.msg,
    }));

    res.status(400).json({ errors: formattedErrors });
    return;
  }

  next();
};
