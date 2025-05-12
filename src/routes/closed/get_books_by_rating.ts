import express, { Request, Response, Router } from 'express';
import { pool } from '../../core/utilities';

const getBooksByRatingRouter: Router = express.Router();

/**
 * @api {get} /c/get_books_by_rating/:rating Get books with average rating >= rating
 *
 * @apiDescription Fetch books with average rating equal to or above the specified value.
 *
 * @apiName GetBooksByRating
 * @apiGroup Book
 *
 * @apiParam {Number} rating Minimum average rating (0–5).
 *
 * @apiSuccess (200) {Object[]} books List of matching books.
 * @apiError (400) {String} message Invalid rating value.
 * @apiError (404) {String} message No books found.
 * @apiError (500) {String} message Server error.
 */
getBooksByRatingRouter.get('/:rating', async (req: Request, res: Response) => {
    const minRating = parseFloat(req.params.rating);

    if (isNaN(minRating) || minRating < 0 || minRating > 5) {
        return res.status(400).json({
            success: false,
            message: 'Invalid rating. Must be a number between 0 and 5.',
        });
    }

    try {
        const query = `
            SELECT 
                b.isbn13,
                a.author,
                b.original_publication_year,
                b.original_title,
                b.title,
                ROUND((
                    br.ratings_1 * 1 + br.ratings_2 * 2 + br.ratings_3 * 3 +
                    br.ratings_4 * 4 + br.ratings_5 * 5
                ) * 1.0 / NULLIF(
                    br.ratings_1 + br.ratings_2 + br.ratings_3 + br.ratings_4 + br.ratings_5, 0
                ), 2) AS average_rating,
                (br.ratings_1 + br.ratings_2 + br.ratings_3 + br.ratings_4 + br.ratings_5) AS ratings_count,
                br.ratings_1, br.ratings_2, br.ratings_3, br.ratings_4, br.ratings_5,
                b.image_url,
                b.small_image_url
            FROM books b
            JOIN author_books ab ON b.isbn13 = ab.isbn13
            JOIN authors a ON ab.author_id = a.author_id
            JOIN book_ratings br ON b.isbn13 = br.isbn13
            WHERE (
                (br.ratings_1 * 1 + br.ratings_2 * 2 + br.ratings_3 * 3 +
                 br.ratings_4 * 4 + br.ratings_5 * 5) * 1.0 /
                NULLIF(
                    br.ratings_1 + br.ratings_2 + br.ratings_3 + br.ratings_4 + br.ratings_5, 0
                )
            ) >= $1;
        `;

        const { rows } = await pool.query(query, [minRating]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No books found with rating above the specified value.',
            });
        }

        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching books by rating:', error);
        res.status(500).json({
            success: false,
            message: 'Server error - contact support',
            error: error.message,
        });
    }
});

export { getBooksByRatingRouter };
