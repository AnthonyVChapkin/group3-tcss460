import express, { NextFunction, Response, Router } from 'express';
import {
    pool,
    validationFunctions,
    credentialingFunctions,
} from '../../core/utilities';
import { IJwtRequest } from '../../core/models';

const updatePasswordRouter: Router = express.Router();

const isStringProvided = validationFunctions.isStringProvided;
const generateHash = credentialingFunctions.generateHash;
const generateSalt = credentialingFunctions.generateSalt;

// Add password validation - same as in register.ts
const isValidPassword = (password: string): boolean =>
    isStringProvided(password) && password.length > 7;

/**
 * @api {patch} /c/update_password Request to update user password
 *
 * @apiDescription Request to update a user's password after validating their current password
 *
 * @apiName UpdatePassword
 * @apiGroup Auth
 *
 * @apiUse JWT
 *
 * @apiBody {String} acc_info User's email or username
 * @apiBody {String} oldpass User's current password
 * @apiBody {String} newpass User's new password
 * @apiBody {String} newpass_retype Retype of the new password for confirmation
 *
 * @apiSuccess (Success 200) {Object} message Success message indicating password was updated
 *
 * @apiError (400: Missing Parameters) {String} message "Missing required information"
 * @apiError (400: Invalid Credentials) {String} message "Invalid credentials - (Wrong old password)"
 * @apiError (400: Invalid New Password) {String} message "Invalid or missing password - (Password must be at least 8 characters long)"
 * @apiError (400: Password Mismatch) {String} message "New password and retyped password don't match"
 * @apiError (400: Same Password) {String} message "New password must be different from current password"
 * @apiError (404: Account Not Found) {String} message "Account not found"
 */
updatePasswordRouter.patch(
    '/',
    (request: IJwtRequest, response: Response, next: NextFunction) => {
        // Check that all required fields are provided
        if (
            isStringProvided(request.body.acc_info) &&
            isStringProvided(request.body.oldpass) &&
            isStringProvided(request.body.newpass) &&
            isStringProvided(request.body.newpass_retype)
        ) {
            next();
        } else {
            response.status(400).send({
                message: 'Missing required information',
            });
        }
    },
    (request: IJwtRequest, response: Response, next: NextFunction) => {
        // Check that new password matches retype
        if (request.body.newpass === request.body.newpass_retype) {
            next();
        } else {
            response.status(400).send({
                message:
                    "New password credentialsand retyped password don't match",
            });
        }
    },
    (request: IJwtRequest, response: Response, next: NextFunction) => {
        // Check that new password is different from old password
        if (request.body.oldpass !== request.body.newpass) {
            next();
        } else {
            response.status(400).send({
                message: 'New password must be different from current password',
            });
        }
    },
    (request: IJwtRequest, response: Response, next: NextFunction) => {
        // Validate new password requirements
        if (isValidPassword(request.body.newpass)) {
            next();
        } else {
            response.status(400).send({
                message: 'Invalid new password - please refer to documentation',
            });
        }
    },
    async (request: IJwtRequest, response: Response) => {
        try {
            // Find the account by email or username
            const accountQuery = `
                SELECT Account.account_id, Account_Credential.salted_hash, Account_Credential.salt
                FROM Account
                INNER JOIN Account_Credential ON Account.account_id = Account_Credential.account_id
                WHERE Account.email = $1 OR Account.username = $1
            `;
            const accountValues = [request.body.acc_info];

            const accountResult = await pool.query(accountQuery, accountValues);

            if (accountResult.rowCount === 0) {
                return response.status(404).send({
                    message: 'Account not found',
                });
            }

            // Verify current password with stored salted hash
            const storedSalt = accountResult.rows[0].salt;
            const storedSaltedHash = accountResult.rows[0].salted_hash;
            const providedSaltedHash = generateHash(
                request.body.oldpass,
                storedSalt
            );

            if (storedSaltedHash !== providedSaltedHash) {
                return response.status(400).send({
                    message:
                        'Invalid credentials - please refer to documentation',
                });
            }

            // Check if user is authorized to update this account
            // Requires JWT token to match the account being updated
            const accountId = accountResult.rows[0].account_id;
            if (request.claims.id != accountId) {
                return response.status(403).send({
                    message: 'Credentials do not match for this user',
                });
            }

            // Generate new salt and hash for the new password
            const newSalt = generateSalt(32);
            const newSaltedHash = generateHash(request.body.newpass, newSalt);

            // Update the password in the database
            const updateQuery = `
                UPDATE Account_Credential 
                SET salted_hash = $1, salt = $2
                WHERE account_id = $3
            `;
            const updateValues = [newSaltedHash, newSalt, accountId];

            await pool.query(updateQuery, updateValues);

            response.status(200).send({
                message: 'Password updated successfully',
            });
        } catch (error) {
            console.error('Error updating password:', error);
            response.status(500).send({
                message: 'Server error - contact support',
            });
        }
    }
);

export { updatePasswordRouter };
