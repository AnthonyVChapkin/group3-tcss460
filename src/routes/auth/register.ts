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
 * @apiDescription Registers a new user.
 * Password rules:
 * - At least 12 characters
 * - 1 uppercase letter
 * - 1 lowercase letter
 * - 1 digit
 * - 1 special character (!@#$%^&*(),.?":{}|<>)
 * Role must be a number between 1-5
 *
 * @apiName PostRegister
 * @apiGroup Auth
 *
 * @apiBody {String} firstname User's first name
 * @apiBody {String} lastname User's last name
 * @apiBody {String} email User's email (must be unique)
 * @apiBody {String} password User's password
 * @apiBody {String} username Username (must be unique)
 * @apiBody {Number} role User role (1-5)
 * @apiBody {String} phone Phone number (10-15 digits)
 *
 * @apiSuccess {String} accessToken JSON Web Token
 * @apiSuccess {Object} user User object
 * @apiSuccess {Number} user.id Internal user ID
 * @apiSuccess {String} user.name First name
 * @apiSuccess {String} user.email User email
 * @apiSuccess {Number} user.role User role
 *
 * @apiError (400: Missing Parameters) {String} message "Missing required information"
 * @apiError (400: Invalid Password) {String} message "Invalid password"
 * @apiError (400: Invalid Password) {String[]} Errors Array of password validation errors
 * @apiError (400: Invalid Phone) {String} message "Invalid phone number"
 * @apiError (400: Invalid Phone) {String[]} Errors Array of phone validation errors
 * @apiError (400: Invalid Email) {String} message "Invalid email"
 * @apiError (400: Invalid Email) {String[]} Errors Array of email validation errors
 * @apiError (400: Invalid Role) {String} message "Invalid or missing role"
 * @apiError (400: Username Exists) {String} message "Username exists"
 * @apiError (400: Email Exists) {String} message "Email exists"
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
                console.error(error);
                const detail = error.detail || '';
                let message = 'Unique constraint violation';

                if (detail.includes('email')) {
                    message = 'Email exists';
                } else if (detail.includes('username')) {
                    message = 'Username exists';
                } else if (detail.includes('phone')) {
                    message = 'Phone number exists';
                }

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
