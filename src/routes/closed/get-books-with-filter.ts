import express, { Request, Response, Router } from 'express';
import { pool, validationFunctions } from '../../core/utilities';
import { IBook, IRatings, IUrlIcon } from '../../core/models';

const getBooksWithFilterRouter: Router = express.Router();

const isNumberProvided = validationFunctions.isNumberProvided;
const isStringProvided = validationFunctions.isStringProvided;

getBooksWithFilterRouter.get(
    '/',
    async (request: Request, response: Response) => {
        // Validation for filter parameters.
        const author: string = isStringProvided(request.query.author)
            ? (request.query.author as string)
            : ''; // Empty string by default

        const title: string = isStringProvided(request.query.title)
            ? (request.query.title as string)
            : ''; // Empty string by default

        const minYear: number =
            isNumberProvided(request.query.minYear) &&
            +request.query.minYear >= 0
                ? +request.query.minYear
                : 0; // Default min year is 0

        const maxYear: number =
            isNumberProvided(request.query.maxYear) &&
            +request.query.maxYear >= 0
                ? +request.query.maxYear
                : new Date().getFullYear(); // Default max year is current date

        const minRating: number =
            isNumberProvided(request.query.minRating) &&
            +request.query.minRating >= 0
                ? +request.query.minRating
                : 0; // Default min avg rating is 0

        const maxRating: number =
            isNumberProvided(request.query.maxRating) &&
            +request.query.maxRating >= 0
                ? +request.query.maxRating
                : 5; // Default max avg rating is 5

        const minRatingCount: number =
            isNumberProvided(request.query.minRatingCount) &&
            +request.query.minRatingCount >= 0
                ? +request.query.minRatingCount
                : 0; // Default min count of ratings is 0

        const maxRatingCount: number =
            isNumberProvided(request.query.maxRatingCount) &&
            +request.query.minRatingCount >= 0
                ? +request.query.maxRatingCount
                : Number.POSITIVE_INFINITY; // Default max count of ratings is infinity

        // Validation for offset and limit stolen from closed_message.ts.
        const limit: number =
            isNumberProvided(request.query.limit) && +request.query.limit > 0
                ? +request.query.limit
                : 10; // Default limit of 10
        const offset: number =
            isNumberProvided(request.query.offset) && +request.query.offset >= 0
                ? +request.query.offset
                : 0; // Default offset of 0

        // Decides if we count all rows in the table or not.
        const getTotal: boolean =
            isStringProvided(request.query.getTotal) &&
            request.query.getTotal == 'false'
                ? false
                : true; // Default is true

        const query = `
					SELECT 
                    b.isbn13,
                    ARRAY_AGG(a.author) AS authors,
                    b.original_publication_year AS publication,
                    b.original_title,
                    b.title,
                    ROUND(
                    (br.ratings_1 * 1.0 + br.ratings_2 * 2.0 + br.ratings_3 * 3.0 + br.ratings_4 * 4.0 + br.ratings_5 * 5.0) /
                    NULLIF((br.ratings_1 + br.ratings_2 + br.ratings_3 + br.ratings_4 + br.ratings_5), 0), 2
                    ) AS average,
                    (br.ratings_1 + br.ratings_2 + br.ratings_3 + br.ratings_4 + br.ratings_5
                    ) AS count,
                    br.ratings_1 AS rating_1,
                    br.ratings_2 AS rating_2,
                    br.ratings_3 AS rating_3,
                    br.ratings_4 AS rating_4,
                    br.ratings_5 AS rating_5,
                    b.image_url AS large,
                    b.small_image_url AS small
                    FROM 
                    books b 
                    JOIN author_books ab ON b.isbn13 = ab.isbn13
                    JOIN authors a ON a.author_id = ab.author_id
                    JOIN book_ratings br ON br.isbn13 = ab.isbn13
                    WHERE b.isbn13 IN (
                    SELECT b2.isbn13
                    FROM books b2
                    JOIN author_books ab2 ON b2.isbn13 = ab2.isbn13
                    JOIN authors a2 ON a2.author_id = ab2.author_id
                    WHERE a2.author ILIKE '%' || $1 || '%'
                    )
                    AND b.title ILIKE '%' || $2 || '%'
                    AND b.original_publication_year BETWEEN $3 AND $4
                    AND ROUND(
                    (br.ratings_1 * 1.0 + br.ratings_2 * 2.0 + br.ratings_3 * 3.0 + br.ratings_4 * 4.0 + br.ratings_5 * 5.0) /
                    NULLIF((br.ratings_1 + br.ratings_2 + br.ratings_3 + br.ratings_4 + br.ratings_5), 0), 2
                    ) BETWEEN $5 AND $6
                    AND (br.ratings_1 + br.ratings_2 + br.ratings_3 + br.ratings_4 + br.ratings_5)
                    BETWEEN $7 AND $8::numeric
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
                    LIMIT $9
                    OFFSET $10;
                    `;

        try {
            const paramValues = [
                author,
                title,
                minYear,
                maxYear,
                minRating,
                maxRating,
                minRatingCount,
                maxRatingCount === Number.POSITIVE_INFINITY
                    ? 'infinity'
                    : maxRatingCount,
                limit,
                offset,
            ];
            const { rows } = await pool.query(query, paramValues);

            let count = null;
            if (getTotal) {
                const result = await pool.query(
                    `
                    SELECT COUNT(*) AS exact_count
                    FROM (
					SELECT b.isbn13
					FROM
                    books b 
                    JOIN author_books ab ON b.isbn13 = ab.isbn13
                    JOIN authors a ON a.author_id = ab.author_id
                    JOIN book_ratings br ON br.isbn13 = ab.isbn13
					WHERE a.author ILIKE '%' || $1 || '%'
					AND b.title ILIKE '%' || $2 || '%'
					AND b.original_publication_year BETWEEN $3 AND $4
					AND
					ROUND(
                    (br.ratings_1 * 1.0 + br.ratings_2 * 2.0 + br.ratings_3 * 3.0 + br.ratings_4 * 4.0 + br.ratings_5 * 5.0) /
                    NULLIF((br.ratings_1 + br.ratings_2 + br.ratings_3 + br.ratings_4 + br.ratings_5), 0), 2
                    ) BETWEEN $5 AND $6
					AND
					(br.ratings_1 + br.ratings_2 + br.ratings_3 + br.ratings_4 + br.ratings_5)
					BETWEEN $7 AND $8::numeric
					GROUP BY b.isbn13
					);
                    `,
                    paramValues.slice(0, 8)
                );
                count = result.rows[0].exact_count;
            }

            // Format rows into IBooks.
            const books: IBook[] = rows.map((row) => {
                return {
                    isbn13: row.isbn13,
                    authors: row.authors,
                    publication: row.publication,
                    original_title: row.original_title,
                    title: row.title,
                    ratings: {
                        average: row.average,
                        count: row.count,
                        rating_1: row.rating_1,
                        rating_2: row.rating_2,
                        rating_3: row.rating_3,
                        rating_4: row.rating_4,
                        rating_5: row.rating_5,
                    } as IRatings,
                    icons: {
                        large: row.large,
                        small: row.small,
                    } as IUrlIcon,
                } as IBook;
            });

            response.status(200).send({
                pagination: {
                    totalRecords: count,
                    limit,
                    offset,
                    nextPage: limit + offset,
                    hasMore: getTotal ? offset + limit < count : null,
                },
                books: books,
            });
        } catch (error) {
            console.error('Database error on get books with filter');
            console.error(error);
            response
                .status(500)
                .send({ message: 'server error - contact support' });
        }
    }
);

export { getBooksWithFilterRouter };
