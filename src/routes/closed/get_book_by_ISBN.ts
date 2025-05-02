import express, { NextFunction, Request, Response, Router } from 'express';
import { pool } from '../../core/utilities';

const getBookByISBNRouter: Router = express.Router();

// Used to pass the cleaned isbn13 to the next function.
interface ISBNRequest extends Request {
    cleanedISBN13?: string;
}

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
 * @apiSuccess {String[]}  book.authors  Array of author names
 * @apiSuccess {Number}  book.original_publication_year Year of original publication
 * @apiSuccess {String}  book.original_title        The book's original title
 * @apiSuccess {String}  book.title                 The display title
 * @apiSuccess {Number}  book.average_rating        Average rating (0‑5)
 * @apiSuccess {Number}  book.ratings_count          Total number of ratings
 * @apiSuccess {Number}  book.ratings_1         1‑star rating count
 * @apiSuccess {Number}  book.ratings_2         2‑star rating count
 * @apiSuccess {Number}  book.ratings_3         3‑star rating count
 * @apiSuccess {Number}  book.ratings_4         4‑star rating count
 * @apiSuccess {Number}  book.ratings_5         5‑star rating count
 * @apiSuccess {String}  book.image_url             Cover image URL
 * @apiSuccess {String}  book.small_image_url       Small cover image URL
 *
 * @apiError (404: ISBN not found) {String} message "ISBN not found"
 * @apiError (400: Malformed ISBN) {String} message "Invalid ISBN – must be a 13‑digit string"
 * @apiError (500: Server Error) {String} message "server error - contact support"
 */
getBookByISBNRouter.get(
    '/:isbn13',
    (request: ISBNRequest, response: Response, next: NextFunction) => {
        const { isbn13 } = request.params;

        // basic validation: we must have 13 digits, and all non-digits are stripped.
        const digitsOnly = isbn13.replace(/[^0-9X]/gi, '');
        if (digitsOnly.length === 13 && /^\d{13}$/.test(digitsOnly)) {
            request.cleanedISBN13 = digitsOnly; // pass clean isbn13 to next function
            next();
        } else {
            response.status(400).send({
                message: 'Invalid ISBN - must be a 13-digit string',
            });
        }
    },
    async (request: ISBNRequest, response: Response) => {
        try {
            const query = `
                    SELECT 
                    b.isbn13,
                    ARRAY_AGG(a.author) AS authors,
                    b.original_publication_year,
                    b.original_title,
                    b.title,
                    ROUND((br.ratings_1*1.0 + br.ratings_2*2 + br.ratings_3*3 + br.ratings_4*4 + br.ratings_5*5) /
                    (br.ratings_1 + br.ratings_2 + br.ratings_3 + br.ratings_4 + br.ratings_5), 2)::FLOAT AS average_rating,
                    br.ratings_1 + br.ratings_2 + br.ratings_3 + br.ratings_4 + br.ratings_5 AS ratings_count,
                    br.ratings_1,
                    br.ratings_2,
                    br.ratings_3,
                    br.ratings_4,
                    br.ratings_5,
                    b.image_url,
                    b.small_image_url
                    FROM books b JOIN author_books ab
                    ON b.isbn13 = ab.isbn13
                    JOIN authors a
                    ON a.author_id = ab.author_id
                    JOIN book_ratings br
                    ON br.isbn13 = ab.isbn13
                    WHERE b.isbn13 = $1
                    GROUP BY
                    b.isbn13,
                    b.original_publication_year,
                    b.original_title,
                    b.title,
                    br.ratings_1,
                    br.ratings_2,
                    br.ratings_3,
                    br.ratings_4,
                    br.ratings_5,
                    b.image_url,
                    b.small_image_url;
            `;

            const result = await pool.query(query, [request.cleanedISBN13]);

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
