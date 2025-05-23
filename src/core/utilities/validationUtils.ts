/**
 * Checks the parameter to see if it is a a String.
 *
 * @param {any} candidate the value to check
 * @returns true if the parameter is a String0, false otherwise
 */
function isString(candidate: any): candidate is string {
    return typeof candidate === 'string';
}

/**
 * Checks the parameter to see if it is a a String with a length greater than 0.
 *
 * @param {any} candidate the value to check
 * @returns true if the parameter is a String with a length greater than 0, false otherwise
 */
function isStringProvided(candidate: any): boolean {
    return isString(candidate) && candidate.length > 0;
}

/**
 * Checks the parameter to see if it can be converted into a number.
 *
 * @param {any} candidate the value to check
 * @returns true if the parameter is a number, false otherwise
 */
function isNumberProvided(candidate: any): boolean {
    return (
        isNumber(candidate) ||
        (candidate != null &&
            candidate != '' &&
            !isNaN(Number(candidate.toString())))
    );
}

/**
 * Helper
 * @param x data value to check the type of
 * @returns true if the type of x is a number, false otherise
 */
function isNumber(x: any): x is number {
    return typeof x === 'number';
}

/**
 * Validates a password based on predefined rules.
 *
 * @param {string} password The password string to validate.
 * @returns {string[]} An array of error messages if any validation rules are violated, otherwise empty.
 *
 * Rules:
 * - At least 12 characters long.
 * - Must contain at least one uppercase letter (A-Z).
 * - Must contain at least one lowercase letter (a-z).
 * - Must contain at least one digit (0-9).
 * - Must contain at least one special character (!@#$%^&*(),.?":{}|<>).
 */
function validatePassword(password: string): string[] {
    const errors: string[] = [];

    // Password must be at least 12 chars long.
    if (password.length < 12) {
        errors.push('Password must be at least 12 characters long.');
    }

    const uppercaseRegex = /[A-Z]/;
    const lowercaseRegex = /[a-z]/;
    const digitRegex = /[0-9]/;
    const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;

    // Contains at last one uppercase char.
    if (!uppercaseRegex.test(password)) {
        errors.push('Password must include at least one uppercase letter.');
    }

    // Contains at least one lowercase char.
    if (!lowercaseRegex.test(password)) {
        errors.push('Password must include at least one lowercase letter.');
    }

    // Contains at least one number/digit.
    if (!digitRegex.test(password)) {
        errors.push('Password must include at least one digit.');
    }

    // Contains at least one special char.
    if (!specialCharRegex.test(password)) {
        errors.push('Password must include at least one special character.');
    }

    return errors;
}

/**
 * Validates an email address.
 *
 * @param {string} email - The email string to validate.
 * @returns {string[]} An array of error messages, if any validation rules are violated.
 */
function validateEmail(email: string): string[] {
    const errors: string[] = [];
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i;

    // Looks something like example@example.com
    if (!emailRegex.test(email)) {
        errors.push('Invalid email format.');
    }

    return errors;
}

/**
 * Validates a phone number.
 *
 * @param {string} phone  The phone number string to validate.
 * @returns {string[]} An array of error messages, if any validation rules are violated.
 */
function validatePhoneNumber(phone: string): string[] {
    const errors: string[] = [];
    const phoneRegex = /^[0-9]{10,15}$/;

    // Is the right lengh and contains only numbers.
    if (!phoneRegex.test(phone)) {
        errors.push('Invalid phone number format. Only digits are allowed.');
    }

    return errors;
}

// Feel free to add your own validations functions!
// for example: isNumericProvided, isValidPassword, isValidEmail, etc
// don't forget to export any

const validationFunctions = {
    isStringProvided,
    isNumberProvided,
    validatePassword,
    validateEmail,
    validatePhoneNumber,
};

export { validationFunctions };
