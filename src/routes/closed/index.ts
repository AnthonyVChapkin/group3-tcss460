import express, { Router } from 'express';

import { checkToken } from '../../core/middleware';
import { tokenTestRouter } from './tokenTest';
import { messageRouter } from './closed_message';
import { getBookByISBNRouter } from './get_book_by_ISBN'
import { bookRouter } from './book';

const closedRoutes: Router = express.Router();

closedRoutes.use('/jwt_test', checkToken, tokenTestRouter);

closedRoutes.use('/c/message', checkToken, messageRouter);
closedRoutes.use('/c/get_book_by_ISBN', checkToken, getBookByISBNRouter);
closedRoutes.use('/c/book', checkToken, bookRouter);

export { closedRoutes };
