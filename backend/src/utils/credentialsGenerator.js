/**
 * Utility for generating random usernames and passwords
 * Excludes look-alike characters: I, l, 1, O, 0
 */

// Character set excluding look-alike characters (I, l, 1, O, 0)
const SAFE_CHARS = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Generates a random string of specified length using safe characters
 * @param {number} length - Length of the string to generate
 * @returns {string} Random string
 */
function generateRandomString(length = 10) {
    let result = '';
    const charsLength = SAFE_CHARS.length;
    
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charsLength);
        result += SAFE_CHARS[randomIndex];
    }
    
    return result;
}

/**
 * Generates a random username
 * Format: usr_ + 10 random characters
 * @returns {string} Random username
 */
function generateUsername() {
    return 'usr_' + generateRandomString(10);
}

/**
 * Generates a random password
 * @returns {string} Random password of 10 characters
 */
function generatePassword() {
    return generateRandomString(10);
}

module.exports = {
    generateRandomString,
    generateUsername,
    generatePassword
};
