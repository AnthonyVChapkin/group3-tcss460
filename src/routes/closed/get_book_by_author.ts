import express, { Request, Response, Router } from 'express';
import { pool, validationFunctions } from '../../core/utilities';

const getBookByAuthorRouter: Router = express.Router();

const { isStringProvided } = validationFunctions;

/**
 * @api {get} /c/book/author/:authorName Find books by author
 *
 * @apiDescription Find books in the database written by the specified author.
 *
 * @apiName getBooksByAuthor
 * @apiGroup Book
 *
 * @apiUse JWT
 *
 * @apiParam  {String} authorName The name of the author to search for.
 *
 * @apiSuccess (Success 200) {Object[]} books List of books written by the author.
 *
 * @apiError (400: Missing Author) {String} message "Author name must be provided"
 * @apiError (404: Author Not Found) {String} message "No books found for the given author"
 * @apiError (500: Server Error) {String} message "Server error - please try again later"
 */
getBookByAuthorRouter.get('/author/:authorName', async (req: Request, res: Response) => {
    const { authorName } = req.params;

    if (!isStringProvided(authorName)) {
        return res.status(400).json({ message: 'Author name must be provided' });
    }

    try {
        const query = `
            SELECT *
            FROM books
            WHERE authors ILIKE '%' || $1 || '%'
        `;
        const { rows } = await pool.query(query, [authorName.trim()]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'No books found for the given author' });
        }

        res.status(200).json({ books: rows });
    } catch (err) {
        console.error('Error fetching books by author:', err);
        res.status(500).json({ message: 'Server error - please try again later' });
    }
});

export { getBookByAuthorRouter };
