import express, { Request, Response, Router } from 'express';
import { pool, validationFunctions } from '../../core/utilities';

const getBooksWithFilterRouter: Router = express.Router();

const isNumberProvided = validationFunctions.isNumberProvided;
const isStringProvided = validationFunctions.isStringProvided;

getBooksWithFilterRouter.get('/', (request: Request, response: Response) => {
    response.status(200).send('Hello world');
});

export { getBooksWithFilterRouter };
