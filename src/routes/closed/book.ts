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
 * @apiBody {Number} average_rating The average rating of the book (0-5)
 * @apiBody {Number} ratings_count The total number of ratings
 * @apiBody {Number} ratings_1 The number of 1-star ratings
 * @apiBody {Number} ratings_2 The number of 2-star ratings
 * @apiBody {Number} ratings_3 The number of 3-star ratings
 * @apiBody {Number} ratings_4 The number of 4-star ratings
 * @apiBody {Number} ratings_5 The number of 5-star ratings
 * @apiBody {String} image_url The URL to the book's cover image
 * @apiBody {String} small_image_url The URL to the book's small cover image
 *
 * @apiSuccess (Success 201) {Object} book The newly created book object
 * @apiSuccess {String} book.isbn13 The ISBN-13 of the book
 * @apiSuccess {String} book.authors The author(s) of the book
 * @apiSuccess {Number} book.original_publication_year The year of original publication
 * @apiSuccess {String} book.original_title The original title of the book
 * @apiSuccess {String} book.title The title of the book
 * @apiSuccess {Number} book.average_rating The average rating of the book
 * @apiSuccess {Number} book.ratings_count The total number of ratings
 * @apiSuccess {Number} book.ratings_1 The number of 1-star ratings
 * @apiSuccess {Number} book.ratings_2 The number of 2-star ratings
 * @apiSuccess {Number} book.ratings_3 The number of 3-star ratings
 * @apiSuccess {Number} book.ratings_4 The number of 4-star ratings
 * @apiSuccess {Number} book.ratings_5 The number of 5-star ratings
 * @apiSuccess {String} book.image_url The URL to the book's cover image
 * @apiSuccess {String} book.small_image_url The URL to the book's small cover image
 *
 * @apiError (400: ISBN exists) {String} message "ISBN already exists"
 * @apiError (400: Missing Parameters) {String} message "Missing required information - please refer to documentation"
 * @apiError (400: Invalid Rating) {String} message "Invalid or missing rating value - please refer to documentation"
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
            isStringProvided(request.body.original_title) &&
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
        const average_rating = parseFloat(request.body.average_rating);
        if (
            isNumberProvided(request.body.average_rating) &&
            average_rating >= 0 &&
            average_rating <= 5 &&
            isNumberProvided(request.body.ratings_count) &&
            isNumberProvided(request.body.ratings_1) &&
            isNumberProvided(request.body.ratings_2) &&
            isNumberProvided(request.body.ratings_3) &&
            isNumberProvided(request.body.ratings_4) &&
            isNumberProvided(request.body.ratings_5)
        ) {
            next();
        } else {
            console.error('Invalid or missing rating value');
            response.status(400).send({
                message:
                    'Invalid or missing rating value - please refer to documentation',
            });
        }
    },
    async (request: Request, response: Response) => {
        try {
            // First, get the maximum ID
            const idQuery = 'SELECT MAX(id) as max_id FROM books';
            const idResult = await pool.query(idQuery);
            const nextId = (idResult.rows[0].max_id || 0) + 1; // If no books exist, start with 1

            // Now insert the book with the new ID
            const theQuery = `
                INSERT INTO books(
                    id,
                    isbn13,
                    authors,
                    publication_year,
                    original_title,
                    title,
                    rating_avg,
                    rating_count,
                    rating_1_star,
                    rating_2_star,
                    rating_3_star,
                    rating_4_star,
                    rating_5_star,
                    image_url,
                    image_small_url
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) 
                RETURNING *`;

            const values = [
                nextId,
                request.body.isbn13,
                request.body.authors,
                request.body.original_publication_year, // Make sure this matches the DB column name
                request.body.original_title,
                request.body.title,
                request.body.average_rating, // This should match rating_avg in DB
                request.body.ratings_count, // This should match rating_count in DB
                request.body.ratings_1, // This should match rating_1_star in DB
                request.body.ratings_2, // This should match rating_2_star in DB
                request.body.ratings_3, // This should match rating_3_star in DB
                request.body.ratings_4, // This should match rating_4_star in DB
                request.body.ratings_5, // This should match rating_5_star in DB
                request.body.image_url,
                request.body.small_image_url, // This should match image_small_url in DB
            ];

            const result = await pool.query(theQuery, values);
            // Return the newly created book
            response.status(201).send({
                book: result.rows[0],
            });
        } catch (error) {
            // Log the error
            console.error('DB Query error on POST book');
            console.error(error);
            response.status(500).send({
                message: 'server error - contact support',
            });
        }
    }
);

export { bookRouter };
