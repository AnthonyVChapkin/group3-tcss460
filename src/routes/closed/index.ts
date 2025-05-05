import express, { Router } from 'express';

import { checkToken } from '../../core/middleware';
import { tokenTestRouter } from './tokenTest';
import { messageRouter } from './closed_message';
import { getBookByISBNRouter } from './get_book_by_ISBN';
import { getBookByAuthorRouter } from './get_book_by_author';
import { updateBookRatingsRouter } from './update_book_ratings';
import { updatePasswordRouter } from './update_password';
import { bookRouter } from './book';
import { getBooksByOffsetRouter } from './get-books-by-offset';

const closedRoutes: Router = express.Router();

closedRoutes.use('/jwt_test', checkToken, tokenTestRouter);

closedRoutes.use('/c/message', checkToken, messageRouter);
closedRoutes.use('/c/get_book_by_ISBN', checkToken, getBookByISBNRouter);
closedRoutes.use('/c/get_book_by_author', checkToken, getBookByAuthorRouter);
closedRoutes.use('/c/update_book_ratings',checkToken, updateBookRatingsRouter )
closedRoutes.use('/c/update_password', checkToken, updatePasswordRouter);
closedRoutes.use('/c/book', checkToken, bookRouter);
closedRoutes.use('/c/books/offset', checkToken, getBooksByOffsetRouter);

export { closedRoutes };
