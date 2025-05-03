import express, { NextFunction, Request, Response, Router } from 'express';
import { pool, validationFunctions } from '../../core/utilities';

const bookRouter: Router = express.Router();

const isStringProvided = validationFunctions.isStringProvided;
const isNumberProvided = validationFunctions.isNumberProvided;

/**
 * @api {post} /c/book Request to add a new book
 *
 * @apiDescription Request to add a new book to the database
 *
 * @apiName PostBook
 * @apiGroup Book
 *
 * @apiUse JWT
 *
 * @apiBody {String} isbn13 The ISBN-13 of the book (must be unique)
 * @apiBody {String} authors The author(s) of the book
 * @apiBody {Number} original_publication_year The year of original publication
 * @apiBody {String} original_title The original title of the book
 * @apiBody {String} title The title of the book
 * @apiBody {Number} ratings_1 The number of 1-star ratings
 * @apiBody {Number} ratings_2 The number of 2-star ratings
 * @apiBody {Number} ratings_3 The number of 3-star ratings
 * @apiBody {Number} ratings_4 The number of 4-star ratings
 * @apiBody {Number} ratings_5 The number of 5-star ratings
 * @apiBody {String} image_url The URL to the book's cover image
 * @apiBody {String} small_image_url The URL to the book's small cover image
 *
 * @apiSuccess (Success 201) {Object} book The newly created book object
 * @apiSuccess (Success 201) {String}  book.isbn13   The ISBN‑13 of the book
 * @apiSuccess (Success 201) {Number}  book.original_publication_year Year of original publication
 * @apiSuccess (Success 201) {String}  book.original_title        The book's original title
 * @apiSuccess (Success 201) {String}  book.title                 The display title
 * @apiSuccess (Success 201) {String}  book.image_url             Cover image URL
 * @apiSuccess (Success 201) {String}  book.small_image_url       Small cover image URL
 * @apiSuccess (Success 201) {String}  book.authors               The author(s) of the book
 * @apiSuccess (Success 201) {Number}  book.average_rating        Average rating (0‑5)
 * @apiSuccess (Success 201) {Number}  book.ratings_count          Total number of ratings
 * @apiSuccess (Success 201) {Number}  book.ratings_1         1‑star rating count
 * @apiSuccess (Success 201) {Number}  book.ratings_2         2‑star rating count
 * @apiSuccess (Success 201) {Number}  book.ratings_3         3‑star rating count
 * @apiSuccess (Success 201) {Number}  book.ratings_4         4‑star rating count
 * @apiSuccess (Success 201) {Number}  book.ratings_5         5‑star rating count
 *
 * @apiError (400: ISBN exists) {String} message "ISBN already exists"
 * @apiError (400: Missing Parameters) {String} message "Missing required information - please refer to documentation"
 * @apiError (400: Invalid Year) {String} message "Invalid or missing publication year - please refer to documentation"
 * @apiError (400: JSON Error) {String} message "malformed JSON in parameters"
 */
bookRouter.post(
    '/',
    (request: Request, response: Response, next: NextFunction) => {
        // Validate required string fields
        if (
            isStringProvided(request.body.isbn13) &&
            isStringProvided(request.body.authors) &&
            isStringProvided(request.body.title) &&
            isStringProvided(request.body.image_url) &&
            isStringProvided(request.body.small_image_url)
        ) {
            next();
        } else {
            console.error('Missing required information');
            response.status(400).send({
                message:
                    'Missing required information - please refer to documentation',
            });
        }
    },
    (request: Request, response: Response, next: NextFunction) => {
        // Validate publication year
        if (
            isNumberProvided(request.body.original_publication_year) &&
            parseInt(request.body.original_publication_year) > 0 &&
            parseInt(request.body.original_publication_year) <=
                new Date().getFullYear()
        ) {
            next();
        } else {
            console.error('Invalid or missing publication year');
            response.status(400).send({
                message:
                    'Invalid or missing publication year - please refer to documentation',
            });
        }
    },
    (request: Request, response: Response, next: NextFunction) => {
        // Validate rating values
        if (
            isNumberProvided(request.body.ratings_1) &&
            isNumberProvided(request.body.ratings_2) &&
            isNumberProvided(request.body.ratings_3) &&
            isNumberProvided(request.body.ratings_4) &&
            isNumberProvided(request.body.ratings_5)
        ) {
            next();
        } else {
            console.error('Invalid or missing rating values');
            response.status(400).send({
                message:
                    'Invalid or missing rating values - please refer to documentation',
            });
        }
    },
    async (request: Request, response: Response) => {
        // Use a transaction to ensure all related data is properly inserted
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // 1. Insert into books table
            const bookInsertQuery = `
                INSERT INTO books(
                    isbn13,
                    original_publication_year,
                    original_title,
                    title,
                    image_url,
                    small_image_url
                ) VALUES ($1, $2, $3, $4, $5, $6) 
                RETURNING *`;

            const bookValues = [
                request.body.isbn13,
                request.body.original_publication_year,
                request.body.original_title || request.body.title, // Use title as fallback if original_title not provided
                request.body.title,
                request.body.image_url,
                request.body.small_image_url,
            ];

            const bookResult = await client.query(bookInsertQuery, bookValues);

            // 2. Insert ratings
            const ratingsInsertQuery = `
                INSERT INTO book_ratings(
                    isbn13,
                    ratings_1,
                    ratings_2,
                    ratings_3,
                    ratings_4,
                    ratings_5
                ) VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *`;

            const ratingsValues = [
                request.body.isbn13,
                request.body.ratings_1,
                request.body.ratings_2,
                request.body.ratings_3,
                request.body.ratings_4,
                request.body.ratings_5,
            ];

            await client.query(ratingsInsertQuery, ratingsValues);

            // 3. Handle authors (could be multiple)
            // Split the authors string, assuming it comes in a format like "Author 1, Author 2"
            const authorsList = request.body.authors
                .split(',')
                .map((author) => author.trim());

            // Create an array to store author IDs for the response
            const authorIds = [];

            for (const authorName of authorsList) {
                // Check if author already exists
                const authorResult = await client.query(
                    'SELECT author_id FROM authors WHERE author = $1',
                    [authorName]
                );

                let authorId;

                if (authorResult.rowCount === 0) {
                    // Author doesn't exist, insert new author
                    const authorInsertResult = await client.query(
                        'INSERT INTO authors(author) VALUES($1) RETURNING author_id',
                        [authorName]
                    );
                    authorId = authorInsertResult.rows[0].author_id;
                } else {
                    // Author exists, get ID
                    authorId = authorResult.rows[0].author_id;
                }

                authorIds.push(authorId);

                // Link author and book in author_books table
                await client.query(
                    'INSERT INTO author_books(author_id, isbn13) VALUES($1, $2)',
                    [authorId, request.body.isbn13]
                );
            }

            await client.query('COMMIT');

            // Construct response object combining book data, ratings, and authors
            const responseBook = {
                ...bookResult.rows[0],
                authors: request.body.authors,
                ratings_1: request.body.ratings_1,
                ratings_2: request.body.ratings_2,
                ratings_3: request.body.ratings_3,
                ratings_4: request.body.ratings_4,
                ratings_5: request.body.ratings_5,
                average_rating: calculateAverageRating(
                    request.body.ratings_1,
                    request.body.ratings_2,
                    request.body.ratings_3,
                    request.body.ratings_4,
                    request.body.ratings_5
                ),
            };

            // Return the newly created book
            response.status(201).send({
                book: responseBook,
            });
        } catch (error) {
            await client.query('ROLLBACK');

            // Log the error
            console.error('DB Query error on POST book');
            console.error(error);

            if (error.constraint === 'books_pkey1') {
                response.status(400).send({
                    message: 'ISBN already exists',
                });
            } else {
                response.status(500).send({
                    message: 'Server error - contact support',
                });
            }
        } finally {
            client.release();
        }
    }
);

// Helper function to calculate average rating
function calculateAverageRating(
    ratings1: number,
    ratings2: number,
    ratings3: number,
    ratings4: number,
    ratings5: number
): number {
    const totalRatings = ratings1 + ratings2 + ratings3 + ratings4 + ratings5;
    if (totalRatings === 0) return 0;

    const weightedSum =
        ratings1 * 1 +
        ratings2 * 2 +
        ratings3 * 3 +
        ratings4 * 4 +
        ratings5 * 5;
    return parseFloat((weightedSum / totalRatings).toFixed(2));
}

export { bookRouter };
