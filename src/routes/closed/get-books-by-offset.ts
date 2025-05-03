import express, { Request, Response, Router } from 'express';
import { pool, validationFunctions } from '../../core/utilities';

const getBooksByOffsetRouter: Router = express.Router();

const isNumberProvided = validationFunctions.isNumberProvided;

getBooksByOffsetRouter.get(
    '/',
    async (request: Request, response: Response) => {
        // Validation stolen from closed_message.ts.
        const limit: number =
            isNumberProvided(request.query.limit) && +request.query.limit > 0
                ? +request.query.limit
                : 10;
        const offset: number =
            isNumberProvided(request.query.offset) && +request.query.offset >= 0
                ? +request.query.offset
                : 0;

        const pageQuery = `
                    SELECT 
					b.isbn13,
					ARRAY_AGG(a.author) AS authors,
					b.original_publication_year,
					b.original_title,
					b.title,
					ROUND((br.ratings_1*1.0 + br.ratings_2*2.0 + br.ratings_3*3.0 + br.ratings_4*4.0 + br.ratings_5*5.0) /
					NULLIF((br.ratings_1 + br.ratings_2 + br.ratings_3 + br.ratings_4 + br.ratings_5), 0), 2) AS average_rating,
					br.ratings_1 + br.ratings_2 + br.ratings_3 + br.ratings_4 + br.ratings_5 AS ratings_count,
					br.ratings_1,
					br.ratings_2,
					br.ratings_3,
					br.ratings_4,
					br.ratings_5,
					b.image_url,
					b.small_image_url
					FROM books b JOIN author_books ab
					ON b.isbn13 = ab.isbn13
					JOIN authors a
					ON a.author_id = ab.author_id
					JOIN book_ratings br
					ON br.isbn13 = ab.isbn13
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
					b.small_image_url
					ORDER BY b.isbn13
					LIMIT $1
					OFFSET $2;
        `;

        try {
            const { rows } = await pool.query(pageQuery, [limit, offset]);

            const result = await pool.query(
                'SELECT count(*) AS exact_count FROM books;'
            );

            const count = result.rows[0].exact_count;

            response.status(200).send({
                pagination: {
                    totalRecords: count,
                    limit,
                    offset,
                    nextPage: limit + offset,
                },
                books: rows,
            });
        } catch (error) {
            console.error('Database error on get books by offset');
            console.error(error);
            response
                .status(500)
                .send({ message: 'server error - contact support' });
        }
    }
);

export { getBooksByOffsetRouter };
