// src/routes/closed/delete_books_by_range.ts - Using IBook directly

import express, { Request, Response, Router, NextFunction } from 'express';
import { pool, validationFunctions } from '../../core/utilities';
import { IBook, IRatings, IUrlIcon } from '../../core/models';

const deleteBooksByRangeRouter: Router = express.Router();

const isNumberProvided = validationFunctions.isNumberProvided;

/**
 * @api {delete} /c/delete_books_by_range Delete books by publication year range
 *
 * @apiDescription Deletes books within a specified range of publication years.
 * Both start_year and end_year are required parameters.
 *
 * @apiName DeleteBooksByRange
 * @apiGroup Book
 *
 * @apiUse JWT
 *
 * @apiQuery {Number} start_year Beginning of the publication year range (inclusive).
 * @apiQuery {Number} end_year End of the publication year range (inclusive).
 *
 * @apiExample {url} Example usage:
 *     /c/delete_books_by_range?start_year=1990&end_year=2009
 *
 * @apiSuccess (Success 200) {Boolean} success Indicates the operation was successful.
 * @apiSuccess {Number} deletedCount The number of books deleted.
 * @apiSuccess {Object[]} books Array of deleted book objects.
 * @apiSuccess {Number} books.isbn13 The ISBN‑13 of the book.
 * @apiSuccess {String} books.authors Author names.
 * @apiSuccess {Number} books.publication Year of original publication.
 * @apiSuccess {String} books.original_title The book's original title.
 * @apiSuccess {String} books.title The display title.
 * @apiSuccess {Object} books.ratings Book rating information.
 * @apiSuccess {Number} books.ratings.average Average rating (0‑5).
 * @apiSuccess {Number} books.ratings.count Total number of ratings.
 * @apiSuccess {Number} books.ratings.rating_1 1‑star rating count.
 * @apiSuccess {Number} books.ratings.rating_2 2‑star rating count.
 * @apiSuccess {Number} books.ratings.rating_3 3‑star rating count.
 * @apiSuccess {Number} books.ratings.rating_4 4‑star rating count.
 * @apiSuccess {Number} books.ratings.rating_5 5‑star rating count.
 * @apiSuccess {Object} books.icons Book cover image URLs.
 * @apiSuccess {String} books.icons.large Cover image URL.
 * @apiSuccess {String} books.icons.small Small cover image URL.
 *
 * @apiError (400: Invalid Parameters) {String} message "Missing or invalid year parameters. Both start_year and end_year must be provided and valid."
 * @apiError (400: Invalid Year Range) {String} message "Invalid year range. start_year must be less than or equal to end_year."
 * @apiError (400: Negative Years) {String} message "Invalid year values. Years cannot be negative."
 * @apiError (400: Future Years) {String} message "Invalid year values. Years cannot be in the future."
 * @apiError (404: No Books Found) {String} message "No books found in the specified year range."
 * @apiError (500: Server Error) {String} message "server error - contact support"
 */
deleteBooksByRangeRouter.delete(
    '/',
    // Middleware to validate the query parameters
    (request: Request, response: Response, next: NextFunction) => {
        // Check if both start_year and end_year are provided and are valid numbers
        if (
            !isNumberProvided(request.query.start_year) ||
            !isNumberProvided(request.query.end_year)
        ) {
            return response.status(400).json({
                success: false,
                message: "Missing or invalid year parameters. Both start_year and end_year must be provided and valid."
            });
        }

        // Parse the years to integers
        const startYear = parseInt(request.query.start_year as string);
        const endYear = parseInt(request.query.end_year as string);

        // Check if the years are negative
        if (startYear < 0 || endYear < 0) {
            return response.status(400).json({
                success: false,
                message: "Invalid year values. Years cannot be negative."
            });
        }

        // Check if the start year is before the end year
        if (startYear > endYear) {
            return response.status(400).json({
                success: false,
                message: "Invalid year range. start_year must be less than or equal to end_year."
            });
        }

        // Check if the years are in the future
        const currentYear = new Date().getFullYear();
        if (startYear > currentYear || endYear > currentYear) {
            return response.status(400).json({
                success: false,
                message: "Invalid year values. Years cannot be in the future."
            });
        }

        // All validations passed, proceed to the next middleware
        next();
    },
    async (request: Request, response: Response) => {
        // Parse the years from the query parameters
        const startYear = parseInt(request.query.start_year as string);
        const endYear = parseInt(request.query.end_year as string);

        // Start a database transaction
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Find books to be deleted and format them directly in the new IBook interface structure
            const booksQuery = `
                SELECT
                    b.isbn13,
                    STRING_AGG(a.author, ', ') AS authors,
                    b.original_publication_year AS publication,
                    b.original_title,
                    b.title,
                    ROUND((br.ratings_1*1.0 + br.ratings_2*2 + br.ratings_3*3 + br.ratings_4*4 + br.ratings_5*5) /
                          NULLIF((br.ratings_1 + br.ratings_2 + br.ratings_3 + br.ratings_4 + br.ratings_5), 0), 2) AS average_rating,
                    (br.ratings_1 + br.ratings_2 + br.ratings_3 + br.ratings_4 + br.ratings_5) AS ratings_count,
                    br.ratings_1,
                    br.ratings_2,
                    br.ratings_3,
                    br.ratings_4,
                    br.ratings_5,
                    b.image_url AS large_image,
                    b.small_image_url AS small_image
                FROM books b
                         JOIN author_books ab ON b.isbn13 = ab.isbn13
                         JOIN authors a ON a.author_id = ab.author_id
                         JOIN book_ratings br ON br.isbn13 = ab.isbn13
                WHERE b.original_publication_year BETWEEN $1 AND $2
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

            const booksResult = await client.query(booksQuery, [startYear, endYear]);

            // If no books found, return a 404
            if (booksResult.rowCount === 0) {
                await client.query('ROLLBACK');
                return response.status(404).json({
                    success: false,
                    message: "No books found in the specified year range."
                });
            }

            // Get the list of ISBNs to delete
            const isbnList = booksResult.rows.map(row => row.isbn13);

            // Delete from book_ratings (child table)
            await client.query('DELETE FROM book_ratings WHERE isbn13 = ANY($1::varchar[]);', [isbnList]);

            // Delete from author_books (junction table)
            await client.query('DELETE FROM author_books WHERE isbn13 = ANY($1::varchar[]);', [isbnList]);

            // Finally, delete from books (parent table)
            await client.query('DELETE FROM books WHERE isbn13 = ANY($1::varchar[]);', [isbnList]);

            // Commit the transaction
            await client.query('COMMIT');

            // Map the database results directly to the IBook interface
            const deletedBooks: IBook[] = booksResult.rows.map(row => ({
                isbn13: parseInt(row.isbn13),
                authors: row.authors,
                publication: row.publication,
                original_title: row.original_title,
                title: row.title,
                ratings: {
                    average: parseFloat(row.average_rating),
                    count: parseInt(row.ratings_count),
                    rating_1: row.ratings_1,
                    rating_2: row.ratings_2,
                    rating_3: row.ratings_3,
                    rating_4: row.ratings_4,
                    rating_5: row.ratings_5
                },
                icons: {
                    large: row.large_image,
                    small: row.small_image
                }
            }));

            // Return success response with count of deleted books and the books themselves
            return response.status(200).json({
                success: true,
                message: `Successfully deleted books published between ${startYear} and ${endYear}.`,
                deletedCount: booksResult.rowCount,
                books: deletedBooks
            });
        } catch (error) {
            // Rollback the transaction in case of error
            await client.query('ROLLBACK');

            console.error('Error deleting books by range:', error);
            return response.status(500).json({
                success: false,
                message: "server error - contact support"
            });
        } finally {
            // Release the client back to the pool
            client.release();
        }
    }
);

export { deleteBooksByRangeRouter };