// Carries the authenticated user id that requireAuth puts on the request.
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export {};
