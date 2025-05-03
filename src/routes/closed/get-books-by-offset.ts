import express, { NextFunction, Request, Response, Router } from 'express';
import { pool, validationFunctions } from '../../core/utilities';

const getBooksByOffsetRouter: Router = express.Router();

const isNumberProvided = validationFunctions.isNumberProvided;

getBooksByOffsetRouter.get(
    '/',
    (request: Request, response: Response, next: NextFunction) => {
        response.status(200).send('hello world');
    }
);

export { getBooksByOffsetRouter };
