import express, { NextFunction, Request, Response, Router } from 'express';
import { pool } from '../../core/utilities';

const deleteBookByISBNRouter: Router = express.Router();

/** Extend Request so we can stash the cleaned ISBN */
interface ISBNRequest extends Request {
    cleanedISBN13?: string;
}

/**
 * @api {delete} /c/delete_book_by_ISBN/:isbn13 Delete a book by ISBN-13
 * @apiName DeleteBookByISBN
 * @apiGroup Book
 *
 * @apiUse JWT
 *
 * @apiParam {String} isbn13 13-digit ISBN (non-digits allowed in input)
 *
 * @apiSuccess (204) {null} No content (book deleted)
 *
 * @apiError (404) message "ISBN not found"
 * @apiError (400) message "Invalid ISBN – must be a 13-digit string"
 * @apiError (500) message "server error - contact support"
 */
deleteBookByISBNRouter.delete(
    '/:isbn13',
    // --- param validation / cleaning ---
    (req: ISBNRequest, res: Response, next: NextFunction) => {
        const digitsOnly = req.params.isbn13.replace(/[^0-9]/g, '');
        if (digitsOnly.length === 13) {
            req.cleanedISBN13 = digitsOnly;
            return next();
        }
        res.status(400).send({
            message: 'Invalid ISBN - must be a 13-digit string',
        });
    },

    // --- delete the book (and children) ---
    async (req: ISBNRequest, res: Response) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            await client.query('DELETE FROM author_books WHERE isbn13 = $1', [
                req.cleanedISBN13,
            ]);
            await client.query('DELETE FROM book_ratings WHERE isbn13 = $1', [
                req.cleanedISBN13,
            ]);

            const { rowCount } = await client.query(
                'DELETE FROM books WHERE isbn13 = $1',
                [req.cleanedISBN13]
            );

            if (rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(404).send({ message: 'ISBN not found' });
            }

            await client.query('COMMIT');
            return res.sendStatus(204);
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('DB error on DELETE /c/delete_book_by_ISBN:', err);
            res.status(500).send({ message: 'server error - contact support' });
        } finally {
            client.release();
        }
    }
);

export { deleteBookByISBNRouter };
