import express, { Request, Response, Router } from 'express';
import { pool } from '../../core/utilities';

const getBookByAuthorRouter: Router = express.Router();

/**
 * @api {get} /c/get_book_by_author/authorName Find books by author
 *
 * @apiDescription Find books written by the specified author.
 *
 * @apiName GetBooksByAuthor
 * @apiGroup Book
 *
 * @apiUse JWT
 *
 * @apiParam {String} authorName Name of the author.
 *
 * @apiSuccess (Success 200) {Object[]} books List of books written by the author.
 *
 * @apiError (404) No books found
 * @apiError (500) Server error
 */
getBookByAuthorRouter.get(
    '/:authorName',
    async (req: Request, res: Response) => {
        const { authorName } = req.params;

        try {
            const query = `
            SELECT 
                b.isbn13, 
                b.original_publication_year, 
                b.original_title, 
                b.title, 
                b.image_url, 
                b.small_image_url, 
                br.ratings_1, br.ratings_2, br.ratings_3, br.ratings_4, br.ratings_5
            FROM authors AS a
            JOIN author_books AS ab ON a.author_id = ab.author_id
            JOIN books AS b ON ab.isbn13 = b.isbn13
            LEFT JOIN book_ratings AS br ON b.isbn13 = br.isbn13
            WHERE a.author ILIKE '%' || $1 || '%'
        `;

            const { rows } = await pool.query(query, [authorName.trim()]);

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
    }
);

export { getBookByAuthorRouter };
