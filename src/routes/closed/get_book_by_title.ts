import express, { NextFunction, Request, Response, Router } from 'express';
import { pool } from '../../core/utilities';
import { IBook, IBookLegacy, convertLegacyBookToNew } from '../../core/models';

const getBookByTitleRouter: Router = express.Router();

/** Extend Request so we can pass the sanitized title on the request object */
interface TitleRequest extends Request {
  cleanedTitle?: string;
}

/**
 * @api {get} /c/get_book_by_title/:title Get Book By Title
 *
 * @apiDescription Retrieve a single book whose *display title* (`books.title`) matches
 * the supplied text (case-insensitive). The title in the URL should be URL-encoded.
 *
 * @apiName GetBookByTitle
 * @apiGroup Book
 *
 * @apiUse JWT
 *
 * @apiParam {String} title The exact display title (URL-encoded if it contains spaces or punctuation).
 *
 * @apiSuccess (200) {Object} book The book object that matches the title
 * @apiSuccessExample {json} Success-Response:
 *   HTTP/1.1 200 OK
 *   {
 *     "book": {
 *       "isbn13": "9781234567890",
 *       "title": "Example Book",
 *       "authors": ["Author One", "Author Two"],
 *       "original_publication_year": 1995,
 *       "average_rating": 4.35,
 *       "ratings_count": 12345,
 *       ...
 *     }
 *   }
 *
 * @apiError (404) {String} message "Title not found"
 * @apiError (400) {String} message "Invalid title – must be 1-255 characters"
 * @apiError (500) {String} message "server error - contact support"
 */
getBookByTitleRouter.get(
  '/:title',
  (req: TitleRequest, res: Response, next: NextFunction) => {
    const raw = req.params.title?.trim();

    if (raw && raw.length > 0 && raw.length <= 255) {
      req.cleanedTitle = raw; 
      return next();
    }

    res
      .status(400)
      .send({ message: 'Invalid title - must be 1-255 characters' });
  },

  async (req: TitleRequest, res: Response) => {
    try {
      const sql = `
        SELECT
          b.isbn13,
          ARRAY_AGG(a.author) AS authors,
          b.original_publication_year,
          b.original_title,
          b.title,
          ROUND(
            (br.ratings_1*1.0 + br.ratings_2*2 + br.ratings_3*3 +
             br.ratings_4*4 + br.ratings_5*5) /
            NULLIF(
              br.ratings_1 + br.ratings_2 + br.ratings_3 +
              br.ratings_4 + br.ratings_5, 0
            ), 2
          )                         AS average_rating,
          (br.ratings_1 + br.ratings_2 + br.ratings_3 +
           br.ratings_4 + br.ratings_5) AS ratings_count,
          br.ratings_1, br.ratings_2, br.ratings_3,
          br.ratings_4, br.ratings_5,
          b.image_url, b.small_image_url
        FROM books b
        JOIN author_books ab ON b.isbn13 = ab.isbn13
        JOIN authors a       ON a.author_id = ab.author_id
        JOIN book_ratings br ON br.isbn13   = ab.isbn13
        WHERE LOWER(b.title) = LOWER($1)
        GROUP BY
          b.isbn13, b.original_publication_year, b.original_title, b.title,
          br.ratings_1, br.ratings_2, br.ratings_3, br.ratings_4, br.ratings_5,
          b.image_url, b.small_image_url
        LIMIT 1;
      `;

      const { rowCount, rows } = await pool.query(sql, [req.cleanedTitle]);

      if (rowCount === 0) {
        return res.status(404).send({ message: 'Title not found' });
      }

      const r = rows[0];

      // Build a legacy-format book first (for your existing converter)
      const legacyBook: IBookLegacy = {
        isbn13: r.isbn13,
        authors: Array.isArray(r.authors) ? r.authors.join(', ') : r.authors,
        original_publication_year: r.original_publication_year,
        original_title: r.original_title,
        title: r.title,
        average_rating: r.average_rating,
        ratings_count: r.ratings_count,
        ratings_1: r.ratings_1,
        ratings_2: r.ratings_2,
        ratings_3: r.ratings_3,
        ratings_4: r.ratings_4,
        ratings_5: r.ratings_5,
        image_url: r.image_url,
        small_image_url: r.small_image_url,
      };

      const book: IBook = convertLegacyBookToNew(legacyBook);

      res.status(200).send({ book });
    } catch (err) {
      console.error('DB Query error on GET book by title:', err);
      res.status(500).send({ message: 'server error - contact support' });
    }
  }
);

export { getBookByTitleRouter };
