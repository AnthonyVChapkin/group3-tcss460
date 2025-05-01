import express, { NextFunction, Request, Response, Router } from 'express';
import { pool, validationFunctions } from '../../core/utilities';

const getBookByISBNRouter: Router = express.Router();

const isStringProvided = validationFunctions.isStringProvided;

/**
 * @api {get} /c/get_book_by_ISBN/:isbn13 Request a book by ISBN‑13
 *
 * @apiDescription Retrieve a single book from the database that matches the supplied ISBN‑13.
 *
 * @apiName GetBookByISBN
 * @apiGroup Book
 *
 * @apiUse JWT
 *
 * @apiParam  {String} isbn13  The 13‑digit ISBN of the desired book.
 *
 * @apiSuccess (Success 200) {Object} book  The book object that matches the ISBN.
 * @apiSuccess {String}  book.isbn13   The ISBN‑13 of the book
 * @apiSuccess {String}  book.authors  The author(s) of the book
 * @apiSuccess {Number}  book.publication_year      Year of original publication
 * @apiSuccess {String}  book.original_title        The book's original title
 * @apiSuccess {String}  book.title                 The display title
 * @apiSuccess {Number}  book.rating_avg            Average rating (0‑5)
 * @apiSuccess {Number}  book.rating_count          Total number of ratings
 * @apiSuccess {Number}  book.rating_1_star         1‑star rating count
 * @apiSuccess {Number}  book.rating_2_star         2‑star rating count
 * @apiSuccess {Number}  book.rating_3_star         3‑star rating count
 * @apiSuccess {Number}  book.rating_4_star         4‑star rating count
 * @apiSuccess {Number}  book.rating_5_star         5‑star rating count
 * @apiSuccess {String}  book.image_url             Cover image URL
 * @apiSuccess {String}  book.image_small_url       Small cover image URL
 *
 * @apiError (400: Missing ISBN) {String} message "Missing required information – please provide a 13‑digit ISBN"
 * @apiError (404: ISBN not found) {String} message "ISBN not found"
 * @apiError (400: Malformed ISBN) {String} message "Invalid ISBN – must be a 13‑digit string"
 * @apiError (400: JSON Error) {String} message "malformed JSON in parameters"
 */
getBookByISBNRouter.get(
    '/:isbn13',
    (request: Request, response: Response, next: NextFunction) => {
        const { isbn13 } = request.params;
        // basic validation: must be provided and 13 digits (all numbers or digits & hyphens already stripped by client)
        if (isStringProvided(isbn13)) {
            const digitsOnly = isbn13.replace(/[^0-9X]/gi, '');
            if (digitsOnly.length === 13 && /^\d{13}$/.test(digitsOnly)) {
                next();
            } else {
                response.status(400).send({
                    message: 'Invalid ISBN - must be a 13-digit string',
                });
            }
        } else {
            response.status(400).send({
                message: 'Missing required information - please provide a 13-digit ISBN',
            });
        }
    },
    async (request: Request, response: Response) => {
        try {
            const { isbn13 } = request.params;
            const query = 'SELECT * FROM books WHERE isbn13 = $1';
            const result = await pool.query(query, [isbn13]);

            if (result.rowCount === 0) {
                response.status(404).send({
                    message: 'ISBN not found',
                });
            } else {
                response.status(200).send({
                    book: result.rows[0],
                });
            }
        } catch (error) {
            console.error('DB Query error on GET book by ISBN');
            console.error(error);
            response.status(500).send({
                message: 'server error - contact support',
            });
        }
    }
);

export { getBookByISBNRouter };