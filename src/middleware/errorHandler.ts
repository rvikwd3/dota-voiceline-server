import { Request, Response, NextFunction } from "express";
import { ApplicationError, HttpCode } from "../types";

/* Error Handling Middleware */

// ApplicationError type predicate
const isApplicationError = (error: Error): error is ApplicationError => {
  if (error instanceof ApplicationError) {
    return error.isOperational;
  }
  return false;
};


/*
* Segregate error types into:
* 1. ApplicationError
* 2. other Errors
* then handle the errors based on the type
*/
const errorHandler = (error: Error, _req: Request, res: Response, next: NextFunction) => {
  console.log("Error Handler Middlware: ", error.message);

  if (isApplicationError(error)) {
    res.status(error.httpCode).json({ message: error.message });
  } else {
    // Check for Response object, because Error could have come from outside the Request-Response cycle
    if (res) {
      res.status(HttpCode.INTERNAL_SERVER_ERROR).json({ message: 'Critical internal server error'});
    }

    // Redirect to Express general Error handler
    next('CRITICAL: Application encountered a critical error');
  }
};

export default errorHandler;