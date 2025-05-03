import express, { Request, Response, Router } from 'express';
import { pool } from '../../core/utilities';

const getBookByAuthorRouter: Router = express.Router();

/**
 * @api {get} /c/get_book_by_author/:author Request books by author name
 *
 * @apiDescription Retrieve books written by the specified author.
 *
 * @apiName GetBooksByAuthor
 * @apiGroup Book
 *
 * @apiUse JWT
 *
 * @apiParam {String} author Name of the author.
 *
 * @apiSuccess (Success 200) {Object[]} books List of books written by the author.
 * @apiSuccess {String}  book.isbn13   The ISBN‑13 of the book
 * @apiSuccess {String}  book.author   The author of the book
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
 * @apiError (404: Books not found) {String} message "No books found"
 * @apiError (500: Server Error) message "server error - contact support"
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
