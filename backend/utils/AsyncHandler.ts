import { Request, Response, NextFunction } from 'express';

/**
 * Industrial Async Wrapper
 * Consolidates try/catch logic into a single higher-order function.
 * Automatically forwards errors to the global IndustrialError handler.
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
