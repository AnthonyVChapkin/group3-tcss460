import express, { Request, Response, Router } from 'express';
import { pool, validationFunctions } from '../../core/utilities';

const getBooksByOffsetRouter: Router = express.Router();

const isNumberProvided = validationFunctions.isNumberProvided;
const isStringProvided = validationFunctions.isStringProvided;

/**
 * @api {get} /c/books/offset Request paginated list of books
 *
 * @apiDescription Retrieve a paginated list of books with optional total count by default.
 *
 * @apiName GetBooksByOffset
 * @apiGroup Book
 *
 * @apiUse JWT
 *
 * @apiParam (Query Parameter(s)) {Number} [limit=10]   Maximum number of books to return per page. If not provided or invalid, sets to default of 10.
 * @apiParam (Query Parameter(s)) {Number} [offset=0]   Number of books to skip before starting to collect the result set. If not provided or invalid, sets to default of 0.
 * @apiParam (Query Parameter(s)) {Boolean} [getTotal=true] Whether to include the total number of books in the response. If not provided or invalid, sets to default of true.
 *
 * @apiExample {url} Example usage:
 *     /c/books/offset?limit=5&offset=10&getTotal=false
 *
 * @apiSuccess (Success 200) {Object} pagination         Pagination metadata.
 * @apiSuccess {Number} pagination.totalRecords          Total number of records (null if getTotal is false).
 * @apiSuccess {Number} pagination.limit                 The page size used in the query.
 * @apiSuccess {Number} pagination.offset                The offset used in the query.
 * @apiSuccess {Number} pagination.nextPage              Offset to use for the next page.
 * @apiSuccess {Boolean} pagination.hasMore              Whether there are more pages left (null if getTotal is false).
 *
 * @apiSuccess {Object[]} books                          List of books.
 * @apiSuccess {String}  books.isbn13                    The ISBN‑13 of the book.
 * @apiSuccess {String[]} books.authors                  List of authors.
 * @apiSuccess {Number}  books.original_publication_year Year of original publication.
 * @apiSuccess {String}  books.original_title            The book's original title.
 * @apiSuccess {String}  books.title                     The display title.
 * @apiSuccess {Number}  books.average_rating            Average rating (0‑5), rounded to two decimal places.
 * @apiSuccess {Number}  books.ratings_count             Total number of ratings.
 * @apiSuccess {Number}  books.ratings_1                 1‑star rating count.
 * @apiSuccess {Number}  books.ratings_2                 2‑star rating count.
 * @apiSuccess {Number}  books.ratings_3                 3‑star rating count.
 * @apiSuccess {Number}  books.ratings_4                 4‑star rating count.
 * @apiSuccess {Number}  books.ratings_5                 5‑star rating count.
 * @apiSuccess {String}  books.image_url                 Cover image URL.
 * @apiSuccess {String}  books.small_image_url           Small cover image URL.
 *
 * @apiError (500: Server Error) message "server error - contact support"
 */
getBooksByOffsetRouter.get(
    '/',
    async (request: Request, response: Response) => {
        // Validation stolen from closed_message.ts.
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

        const pageQuery = `
                    SELECT 
					b.isbn13,
					ARRAY_AGG(a.author) AS authors,
					b.original_publication_year,
					b.original_title,
					b.title,
					ROUND((br.ratings_1*1.0 + br.ratings_2*2.0 + br.ratings_3*3.0 + br.ratings_4*4.0 + br.ratings_5*5.0) /
					NULLIF((br.ratings_1 + br.ratings_2 + br.ratings_3 + br.ratings_4 + br.ratings_5), 0), 2) AS average_rating,
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
					b.small_image_url
					ORDER BY b.isbn13
					LIMIT $1
					OFFSET $2;
        `;

        try {
            const { rows } = await pool.query(pageQuery, [limit, offset]);

            // Counts total rows in table if getTotal is true. Otherwise count is null.
            let count = null;
            if (getTotal) {
                const result = await pool.query(
                    'SELECT count(*) AS exact_count FROM books;'
                );
                count = result.rows[0].exact_count;
            }

            response.status(200).send({
                pagination: {
                    totalRecords: count,
                    limit,
                    offset,
                    nextPage: limit + offset,
                    hasMore: getTotal ? offset + limit < count : null,
                },
                books: rows,
            });
        } catch (error) {
            console.error('Database error on get books by offset');
            console.error(error);
            response
                .status(500)
                .send({ message: 'server error - contact support' });
        }
    }
);

export { getBooksByOffsetRouter };
