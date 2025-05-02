import express, { Request, Response, Router } from 'express';
import { pool } from '../../core/utilities';

const getBookByAuthorRouter: Router = express.Router();

/**
 * @api {get} /c/get_book_by_author/:author Find books by author
 *
 * @apiDescription Find books written by the specified author.
 *
 * @apiName GetBooksByAuthor
 * @apiGroup Book
 *
 * @apiUse JWT
 *
 * @apiParam {String} author Name of the author.
 *
 * @apiSuccess (Success 200) {Object[]} books List of books written by the author.
 *
 * @apiError (404) No books found
 * @apiError (500) Server error
 */
getBookByAuthorRouter.get('/:author', async (req: Request, res: Response) => {
    const { author } = req.params;

    try {
        const query = `
            SELECT 
                b.isbn13,
				a.author,
                b.original_publication_year, 
                b.original_title, 
                b.title,
				ROUND((br.ratings_1*1.0 + br.ratings_2*2 + br.ratings_3*3 + br.ratings_4*4 + br.ratings_5*5) /
                NULLIF((br.ratings_1 + br.ratings_2 + br.ratings_3 + br.ratings_4 + br.ratings_5), 2), 0)::FLOAT AS average_rating,
				br.ratings_1 + br.ratings_2 + br.ratings_3 + br.ratings_4 + br.ratings_5 AS ratings_count,
                br.ratings_1, br.ratings_2, br.ratings_3, br.ratings_4, br.ratings_5,
				b.image_url, 
                b.small_image_url
            FROM authors AS a
            JOIN author_books AS ab ON a.author_id = ab.author_id
            JOIN books AS b ON ab.isbn13 = b.isbn13
            LEFT JOIN book_ratings AS br ON b.isbn13 = br.isbn13
            WHERE a.author ILIKE '%' || $1 || '%';
        `;

        const { rows } = await pool.query(query, [author.trim()]);

        if (rows.length === 0) {
            return res
                .status(404)
                .json({ message: 'No books found for the given author' });
        }

        res.status(200).json({ books: rows });
    } catch (error) {
        console.error('Error fetching books by author:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
});

export { getBookByAuthorRouter };
