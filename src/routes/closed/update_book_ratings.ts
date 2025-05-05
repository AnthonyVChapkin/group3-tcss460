import express, { Request, Response, Router } from 'express';
import { pool } from '../../core/utilities';

const updateBookRatingsRouter: Router = express.Router();

/**
 * @api {put} /c/update_book_ratings/:isbn13 Update book ratings
 *
 * @apiDescription Updates the rating counts for a specific book.
 *
 * @apiName UpdateBookRatings
 * @apiGroup Book
 *
 * @apiUse JWT
 *
 * @apiParam {String} isbn13 ISBN-13 of the book.
 *
 * @apiBody {Number} ratings_1 1-star rating count.
 * @apiBody {Number} ratings_2 2-star rating count.
 * @apiBody {Number} ratings_3 3-star rating count.
 * @apiBody {Number} ratings_4 4-star rating count.
 * @apiBody {Number} ratings_5 5-star rating count.
 *
 * @apiSuccess (Success 200) {String} message Book ratings updated successfully.
 *
 * @apiError (400: Bad Request) {String} message "Missing or invalid rating values"
 * @apiError (404: Book not found) {String} message "Book not found"
 * @apiError (500: Server Error) message "Server error - contact support"
 */
updateBookRatingsRouter.put('/:isbn13', async (req: Request, res: Response) => {
    const { isbn13 } = req.params;
    const { ratings_1, ratings_2, ratings_3, ratings_4, ratings_5 } = req.body;

    // Validate required fields are numbers and present
    const ratings = [ratings_1, ratings_2, ratings_3, ratings_4, ratings_5];
    if (ratings.some(r => typeof r !== 'number' || r < 0)) {
        return res.status(400).json({
            success: false,
            message: 'Missing or invalid rating values',
        });
    }

    try {
        const result = await pool.query(
            `
            UPDATE book_ratings
            SET ratings_1 = $1,
                ratings_2 = $2,
                ratings_3 = $3,
                ratings_4 = $4,
                ratings_5 = $5
            WHERE isbn13 = $6
            `,
            [ratings_1, ratings_2, ratings_3, ratings_4, ratings_5, isbn13]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Book not found',
            });
        }

        res.status(200).json({
            success: true,
            message: 'Book ratings updated successfully',
        });
    } catch (error) {
        console.error('Error updating book ratings:', error);
        res.status(500).json({
            success: false,
            message: 'Server error - contact support',
            error: error.message,
        });
    }
});

export { updateBookRatingsRouter };
