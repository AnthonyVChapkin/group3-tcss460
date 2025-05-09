import express, { Request, Response, Router } from 'express';
import { pool, validationFunctions } from '../../core/utilities';

const getBooksWithFilterRouter: Router = express.Router();

const isNumberProvided = validationFunctions.isNumberProvided;
const isStringProvided = validationFunctions.isStringProvided;

getBooksWithFilterRouter.get(
    '/',
    async (request: Request, response: Response) => {
        // Validation for offset and limit stolen from closed_message.ts.
        const limit: number =
            isNumberProvided(request.query.limit) && +request.query.limit > 0
                ? +request.query.limit
                : 10; // Default limit of 10
        const offset: number =
            isNumberProvided(request.query.offset) && +request.query.offset >= 0
                ? +request.query.offset
                : 0; // Default offset of 0

        // Decides if we count all rows in the table or not.
        const getTotal: boolean =
            isStringProvided(request.query.getTotal) &&
            request.query.getTotal == 'false'
                ? false
                : true; // Default is true

        // Validation for filter parameters.
        const author: string = isStringProvided(request.query.author)
            ? (request.query.author as string)
            : ''; // Empty string by default

        const title: string = isStringProvided(request.query.title)
            ? (request.query.title as string)
            : ''; // Empty string by default

        const minYear: number = isNumberProvided(request.query.minYear)
            ? +request.query.minYear
            : 0; // Default min year is 0

        const maxYear: number = isNumberProvided(request.query.maxYear)
            ? +request.query.maxYear
            : new Date().getFullYear(); // Default max year is current date

        const minRating: number = isNumberProvided(request.query.minRating)
            ? +request.query.minRating
            : 0; // Default min avg rating is 0

        const maxRating: number = isNumberProvided(request.query.maxRating)
            ? +request.query.maxRating
            : 5; // Default max avg rating is 5
    }
);

export { getBooksWithFilterRouter };
