// express is the framework we're going to use to handle requests
import express, { Request, Response, Router, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const key = {
    secret: process.env.JSON_WEB_TOKEN,
};

import {
    pool,
    validationFunctions,
    credentialingFunctions,
} from '../../core/utilities';

const isStringProvided = validationFunctions.isStringProvided;
const isNumberProvided = validationFunctions.isNumberProvided;
const generateHash = credentialingFunctions.generateHash;
const generateSalt = credentialingFunctions.generateSalt;
const validatePassword = validationFunctions.validatePassword;
const validatePhoneNumber = validationFunctions.validatePhoneNumber;
const validateEmail = validationFunctions.validateEmail;

const registerRouter: Router = express.Router();

export interface IUserRequest extends Request {
    id: number;
}

// Middleware for email validation
const emailMiddlewareCheck = (
    request: Request,
    response: Response,
    next: NextFunction
) => {
    const emailErrors = validateEmail(request.body.email);

    if (emailErrors.length === 0) {
        next();
    } else {
        response
            .status(400)
            .send({ message: 'Invalid email', Errors: emailErrors });
    }
};

/**
 * @api {post} /register Request to register a user
 *
 * @apiDescription Registers a new user. Password must be at least 12 characters long, include at least one uppercase letter, one lowercase letter, one digit, and one special character. Role must be a number between 1 and 5.
 *
 * @apiName PostRegister
 * @apiGroup Auth
 *
 * @apiBody {String} firstname a users first name
 * @apiBody {String} lastname a users last name
 * @apiBody {String} email a users email *unique
 * @apiBody {String} password a users password
 * @apiBody {String} username a username *unique
 * @apiBody {Number} role a role for this user (1-5)
 * @apiBody {String} phone a phone number for this user
 *
 * @apiSuccess {String} accessToken JSON Web Token
 * @apiSuccess {Object} user a user object
 * @apiSuccess {string} user.name the first name associated with <code>email</code>
 * @apiSuccess {string} user.email The email associated with <code>email</code>
 * @apiSuccess {string} user.role The role associated with <code>email</code>
 * @apiSuccess {number} user.id The internal user id associated with <code>email</code>
 *
 * @apiError (400: Missing Parameters) {String} message "Missing required information"
 * @apiError (400: Invalid Password) {String} message "Invalid or missing password  - please refer to documentation"
 * @apiError (400: Invalid Phone) {String} message "Invalid or missing phone number  - please refer to documentation"
 * @apiError (400: Invalid Email) {String} message "Invalid or missing email  - please refer to documentation"
 * @apiError (400: Invalid Role) {String} message "Invalid or missing role  - please refer to documentation"
 * @apiError (400: Username exists) {String} message "Username exists"
 * @apiError (400: Email exists) {String} message "Email exists"
 *
 */
registerRouter.post(
    '/register',
    emailMiddlewareCheck,
    (request: Request, response: Response, next: NextFunction) => {
        const phoneErrors = validatePhoneNumber(request.body.phone);

        if (phoneErrors.length === 0) {
            next();
        } else {
            response
                .status(400)
                .send({ message: 'Invalid phone number', Errors: phoneErrors });
        }
    },
    (request: Request, response: Response, next: NextFunction) => {
        const passwordErrors = validatePassword(request.body.password);

        if (passwordErrors.length === 0) {
            next();
        } else {
            response
                .status(400)
                .send({ message: 'Invalid password', Errors: passwordErrors });
        }
    },
    (request: Request, response: Response, next: NextFunction) => {
        const { firstname, lastname, username, role } = request.body;

        if (
            isStringProvided(firstname) &&
            isStringProvided(lastname) &&
            isStringProvided(username) &&
            isNumberProvided(role)
        ) {
            next();
        } else {
            response
                .status(400)
                .send({ message: 'Missing required information' });
        }
    },
    (request: Request, response: Response, next: NextFunction) => {
        const role = Number(request.body.role);
        if (role >= 1 && role <= 5) {
            next();
        } else {
            response.status(400).send({
                message:
                    'Invalid or missing role  - please refer to documentation',
            });
        }
    },
    async (request: IUserRequest, response: Response) => {
        try {
            const {
                firstname,
                lastname,
                username,
                email,
                phone,
                role,
                password,
            } = request.body;

            const salt = generateSalt(32);
            const saltedHash = generateHash(password, salt);

            const query =
                'INSERT INTO Account(firstname, lastname, username, email, phone, account_role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING account_id';
            const values = [
                firstname,
                lastname,
                username,
                email,
                phone,
                Number(role),
            ];

            const result = await pool.query(query, values);
            const userId = result.rows[0].account_id;

            await pool.query(
                'INSERT INTO Account_Credential(account_id, salted_hash, salt) VALUES ($1, $2, $3)',
                [userId, saltedHash, salt]
            );

            const accessToken = jwt.sign({ role, id: userId }, key.secret, {
                expiresIn: '14 days',
            });

            response.status(201).send({
                accessToken,
                user: { id: userId, name: firstname, email, role },
            });
        } catch (error) {
            if (error.code === '23505') {
                // Unique constraint violation
                const message = error.detail.includes('email')
                    ? 'Email exists'
                    : 'Username exists';
                response.status(400).send({ message });
            } else {
                console.error(error);
                response
                    .status(500)
                    .send({ message: 'Server error - contact support' });
            }
        }
    }
);

export { registerRouter };
