import express, { Router } from 'express';

import { checkToken } from '../../core/middleware';
import { tokenTestRouter } from './tokenTest';
import { messageRouter } from './closed_message';
import { getBookByISBNRouter } from './get_book_by_ISBN';
import { getBookByAuthorRouter } from './get_book_by_author';
import { getBooksByOffsetRouter } from './get-books-by-offset';

import { bookRouter } from './book';

const closedRoutes: Router = express.Router();

closedRoutes.use('/jwt_test', checkToken, tokenTestRouter);

closedRoutes.use('/c/message', checkToken, messageRouter);
closedRoutes.use('/c/get_book_by_ISBN', checkToken, getBookByISBNRouter);
closedRoutes.use('/c/get_book_by_author', checkToken, getBookByAuthorRouter);
closedRoutes.use('/c/book', checkToken, bookRouter);
closedRoutes.use('/c/books/offset', checkToken, getBooksByOffsetRouter);

export { closedRoutes };
