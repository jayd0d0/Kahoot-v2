import validator from 'validator';
import { UserPassword, getData, setData } from './dataStore';
import HTTPError from 'http-errors';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// ====================================================================
// ========================= Helper Function ==========================
// ====================================================================

function getHash(password: string) {
  return crypto.createHash('sha256').update(password).digest('hex');
}
// ====================================================================
// ========================= iter2 (Using iter1) ======================
// ====================================================================

/**
* Given an userinfo, register admin users.
*
* @param {string} email - user's vertification
* @param {string} password - user's vertification
* @param {string} nameFirst - user's firstname
* @param {string} nameLast - user's lastname
* @returns {{token: string}} - "session key"
*/
export function adminAuthRegister(email: string, password: string, nameFirst: string, nameLast: string) {
  const data = getData();
  // Checking duplicate email
  for (const user of data.users) {
    if (user.email === email) {
      return { error: 'Email address is used by another user' };
    }
  }
  // Checking valid email
  if (!validator.isEmail(email)) {
    return { error: 'Email does not satisfy validator' };
  }
  // Checking for incorrect characters
  const regex = /[^a-zA-Z\s'-]/;
  if (regex.test(nameFirst)) {
    return { error: 'NameFirst contains characters other than lowercase letters, uppercase letters, spaces, hyphens, or apostrophes' };
  } else if (regex.test(nameLast)) {
    return { error: 'NameLast contains characters other than lowercase letters, uppercase letters, spaces, hyphens, or apostrophes' };
  }
  // Checking for incorrect length - nameFirst and nameLast
  if (nameFirst.length < 2 || nameFirst.length > 20) {
    return { error: 'NameFirst is less than 2 characters or more than 20 characters' };
  } else if (nameLast.length < 2 || nameLast.length > 20) {
    return { error: 'NameLast is less than 2 characters or more than 20 characters' };
  }
  // Checking for password length
  if (password.length < 8) {
    return { error: 'Password is less than 8 characters' };
  }
  // Checking if password contains at least one character and one number
  const hasNumber = /\d/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);
  if (!hasNumber || !hasLetter) {
    return { error: 'Password does not contain at least one number and at least one letter' };
  }
  // After passing error checks, store user information in dataStore
  data.users.push({
    userId: data.users.length + 1,
    name: `${nameFirst} ${nameLast}`,
    nameFirst: nameFirst,
    nameLast: nameLast,
    email: email,
    password: getHash(password),
    numSuccessfulLogins: 1,
    numFailedPasswordsSinceLastLogin: 0,
  });
  const payload = {
    userId: data.users.length,
    email: email,
    name: `${nameFirst} ${nameLast}`,
  };
  const secretKey = password;
  const token = jwt.sign(payload, secretKey);
  data.tokens.push({
    token: token,
    userId: payload.userId,
  });
  const newUserPassword: UserPassword = {
    userId: payload.userId,
    passwordUsedBefore: [getHash(password)],
  };
  data.userPassword.push(newUserPassword);
  setData(data);
  return {
    token: token,
  };
}

/**
* Given email and password, login to this admin user.
*
* @param {string} email - user's vertification
* @param {string} password - user's vertification
* @returns {{token: string}} - "session key"
*/
export function adminAuthLogin(email: string, password: string) {
  const data = getData();
  for (const user of data.users) {
    if (user.email === email) {
      if (user.password === getHash(password)) {
        user.numSuccessfulLogins++;
        user.numFailedPasswordsSinceLastLogin = 0;

        const payload = {
          userId: user.userId,
          email: email,
          name: user.name,
        };
        const secretKey = password;
        const token = jwt.sign(payload, secretKey);
        data.tokens.push({
          token: token,
          userId: user.userId,
        });

        setData(data);
        return {
          token: token,
        };
      } else {
        user.numFailedPasswordsSinceLastLogin++;
        return { error: 'Password is not correct for the given email' };
      }
    }
  }
  return { error: 'Email address does not exist' };
}

/**
 * Given an admin user's authUserId, return details about the user.
 *
 * @param {string} token - unique identifier for admin users
 * @returns {{user: {userId: integer, name: string, email: string,
* numSuccessfulLogin: integer, numFailedPasswordsSinceLastLogin: integer}}}
*/
export function adminUserDetails(token: string) {
  const data = getData();
  if (!token || typeof token !== 'string') {
    return {
      error: 'Token is not a valid structure'
    };
  }
  const checkToken = data.tokens.some((obj) => obj.token === token);
  if (!checkToken) {
    return {
      error: 'Provided token is valid structure, but is not for a currently logged in session',
    };
  }
  const tokenFound = data.tokens.find((obj) => obj.token === token);
  const userFound = data.users.find((obj) => obj.userId === tokenFound.userId);
  return {
    user:
       {
         userId: userFound.userId,
         name: `${userFound.nameFirst} ${userFound.nameLast}`,
         email: userFound.email,
         numSuccessfulLogins: userFound.numSuccessfulLogins,
         numFailedPasswordsSinceLastLogin: userFound.numFailedPasswordsSinceLastLogin,
       }
  };
}

// ====================================================================
// ========================= iter2 (New) ==============================
// ====================================================================

/**
* Given email and password, logout to this admin user.
*
* @param {string} token - user's token
* @returns {{}} - empty object
*/
export function adminAuthLogout(token: string) {
  const data = getData();
  if (!token || typeof token !== 'string') {
    return { error: 'Token is not a valid structure' };
  }
  const checkToken = data.tokens.some((obj) => obj.token === token);
  if (!checkToken) {
    return { error: 'This token is for a user who has already logged out' };
  }
  const tokenIndex = data.tokens.findIndex((obj) => obj.token === token);
  if (tokenIndex !== -1) {
    data.tokens.splice(tokenIndex, 1);
    setData(data);
  }
  return {};
}

/**
* Update the details of an admin user(non-password)
* @param {string} token - user's token
* @param {string} email - user's new email
* @param {string} nameFirst - user's new First name
* @param {string} nameLast - user's new Last name
* @returns {{}} - empty object
*/
export function adminUserDetailsUpdate(token: string, email: string, nameFirst: string, nameLast: string) {
  const data = getData();
  // Checking if token has valid sturcture
  if (!token || typeof token !== 'string') {
    return { error: 'Token is not a valid structure' };
  }
  // Checking if token exist
  const checkToken = data.tokens.some((obj) => obj.token === token);
  if (!checkToken) {
    return { error: 'Provided token is valid structure, but is not for a currently logged in session' };
  }
  // Checking if email already exist
  for (const user of data.users) {
    if (user.email === email) {
      return { error: 'Email is currently used by another user (excluding the current authorised user)' };
    }
  }
  // Checking valid email
  if (!validator.isEmail(email)) {
    return { error: 'Email does not satisfy validator' };
  }
  // Checking for incorrect characters
  const regex = /[^a-zA-Z\s'-]/;
  if (regex.test(nameFirst)) {
    return { error: 'NameFirst contains characters other than lowercase letters, uppercase letters, spaces, hyphens, or apostrophes' };
  } else if (regex.test(nameLast)) {
    return { error: 'NameLast contains characters other than lowercase letters, uppercase letters, spaces, hyphens, or apostrophes' };
  }
  // Checking for incorrect length - nameFirst and nameLast
  if (nameFirst.length < 2 || nameFirst.length > 20) {
    return { error: 'NameFirst is less than 2 characters or more than 20 characters' };
  } else if (nameLast.length < 2 || nameLast.length > 20) {
    return { error: 'NameLast is less than 2 characters or more than 20 characters' };
  }
  const tokenFound = data.tokens.find((obj) => obj.token === token);
  const userIndex = data.users.findIndex((obj) => obj.userId === tokenFound.userId);
  const userFound = data.users.find((user) => user.userId === tokenFound.userId);
  // Checking if email changed
  if (data.users[userIndex].email !== email) {
    data.users[userIndex].email = email;
  }
  // Checking if only nameFirst changed
  if (data.users[userIndex].nameFirst !== nameFirst && data.users[userIndex].nameLast === nameLast) {
    data.users[userIndex].nameFirst = nameFirst;
    data.users[userIndex].name = `${nameFirst} ${userFound.nameLast}`;
  }
  // Checking if only nameLast changed
  if (data.users[userIndex].nameLast !== nameLast && data.users[userIndex].nameFirst === nameFirst) {
    data.users[userIndex].nameLast = nameLast;
    data.users[userIndex].name = `${userFound.nameFirst} ${nameLast}`;
  }
  // Checking if both nameFirst and nameLast changed
  if (data.users[userIndex].nameFirst !== nameFirst && data.users[userIndex].nameLast !== nameLast) {
    data.users[userIndex].nameFirst = nameFirst;
    data.users[userIndex].nameLast = nameLast;
    data.users[userIndex].name = `${nameFirst} ${nameLast}`;
  }
  // Update the data
  setData(data);
  return {};
}

/**
* Given token, old password and new password, update password
* @param {string} token - user's token
* @param {string} oldPassword - user's old password
* @param {string} newPassword - user's new password
* @returns {{}} - empty object
*/
export function adminUserPasswordUpdate(token: string, oldPassword: string, newPassword: string) {
  const data = getData();
  // Test to check if token is a string of numbers
  if (!token || typeof token !== 'string') {
    return { error: 'Token is not a valid structure' };
  }
  // Checking provided token is valid structure, but is not for a currently logged in session
  const tokenFound = data.tokens.find((user) => user.token === token);
  if (!tokenFound) {
    return {
      error: 'Provided token is valid structure, but is not for a currently logged in session',
    };
  }
  // Checking old Password is not the correct old password
  const passwordFound = data.users.find((user) => user.password === getHash(oldPassword));
  if (!passwordFound) {
    return {
      error: 'Old Password is not the correct old password',
    };
  }
  // Checking if Old Password and New Password match exactly
  if (oldPassword === newPassword) {
    return {
      error: 'Old Password and New Password match exactly',
    };
  }
  // Checking New Password has already been used before by this user
  const usersOldPassword = data.userPassword.find((user) => user.userId === tokenFound.userId);
  const passwordBeenUsed = usersOldPassword.passwordUsedBefore.includes(getHash(newPassword));
  if (passwordBeenUsed) {
    return {
      error: 'New Password has already been used before by this user',
    };
  }
  // Error checking that the length of password is less than 8 characters
  if (newPassword.length < 8) {
    return { error: 'New Password is less than 8 characters' };
  }
  // Error checking that the password has at least one number and one letter
  const hasNumber = /\d/.test(newPassword);
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  if (!hasNumber || !hasLetter) {
    return { error: 'New Password does not contain at least one number and at least one letter' };
  }
  const userIndex = data.users.findIndex((user) => user.userId === tokenFound.userId);
  data.users[userIndex].password = getHash(newPassword);
  usersOldPassword.passwordUsedBefore.push(getHash(newPassword));
  setData(data);
  return {};
}

// ====================================================================
// ========================= iter3 (Modified) =========================
// ====================================================================

/**
* Given email and password, logout to this admin user.
*
* @param {string} token - user's token
* @returns {{}} - empty object
*/
export function adminAuthLogoutV2(token: string) {
  const data = getData();
  if (!token || typeof token !== 'string') {
    throw HTTPError(401, 'Token is not a valid structure');
  }
  const checkToken = data.tokens.some((obj) => obj.token === token);
  if (!checkToken) {
    throw HTTPError(400, 'This token is for a user who has already logged out');
  }
  const tokenIndex = data.tokens.findIndex((obj) => obj.token === token);
  if (tokenIndex !== -1) {
    data.tokens.splice(tokenIndex, 1);
    setData(data);
  }
  return {};
}

/**
 * Given an admin user's authUserId, return details about the user.
 *
 * @param {string} token - unique identifier for admin users
 * @returns {{user: {userId: integer, name: string, email: string,
* numSuccessfulLogin: integer, numFailedPasswordsSinceLastLogin: integer}}}
*/
export function adminUserDetailsV2(token: string) {
  const data = getData();
  if (!token || typeof token !== 'string') {
    throw HTTPError(401, 'Token is not a valid structure');
  }
  const checkToken = data.tokens.some((obj) => obj.token === token);
  if (!checkToken) {
    throw HTTPError(403, 'Provided token is valid structure, but is not for a currently logged in session');
  }
  const tokenFound = data.tokens.find((obj) => obj.token === token);
  const userFound = data.users.find((obj) => obj.userId === tokenFound.userId);
  return {
    user:
       {
         userId: userFound.userId,
         name: `${userFound.nameFirst} ${userFound.nameLast}`,
         email: userFound.email,
         numSuccessfulLogins: userFound.numSuccessfulLogins,
         numFailedPasswordsSinceLastLogin: userFound.numFailedPasswordsSinceLastLogin,
       }
  };
}

/**
* Update the details of an admin user(non-password)
* @param {string} token - user's token
* @param {string} email - user's new email
* @param {string} nameFirst - user's new First name
* @param {string} nameLast - user's new Last name
* @returns {{}} - empty object
*/
export function adminUserDetailsUpdateV2(token: string, email: string, nameFirst: string, nameLast: string) {
  const data = getData();
  // Checking if token has valid sturcture
  if (!token || typeof token !== 'string') {
    throw HTTPError(401, 'Token is not a valid structure');
  }
  // Checking if token exist
  const checkToken = data.tokens.some((obj) => obj.token === token);
  if (!checkToken) {
    throw HTTPError(403, 'Provided token is valid structure, but is not for a currently logged in session');
  }
  // Checking if email already exist
  for (const user of data.users) {
    if (user.email === email) {
      throw HTTPError(400, 'Email is currently used by another user (excluding the current authorised user)');
    }
  }
  // Checking valid email
  if (!validator.isEmail(email)) {
    throw HTTPError(400, 'Email does not satisfy validator');
  }
  // Checking for incorrect characters
  const regex = /[^a-zA-Z\s'-]/;
  if (regex.test(nameFirst)) {
    throw HTTPError(400, 'NameFirst contains characters other than lowercase letters, uppercase letters, spaces, hyphens, or apostrophes');
  } else if (regex.test(nameLast)) {
    throw HTTPError(400, 'NameLast contains characters other than lowercase letters, uppercase letters, spaces, hyphens, or apostrophes');
  }
  // Checking for incorrect length - nameFirst and nameLast
  if (nameFirst.length < 2 || nameFirst.length > 20) {
    throw HTTPError(400, 'NameFirst is less than 2 characters or more than 20 characters');
  } else if (nameLast.length < 2 || nameLast.length > 20) {
    throw HTTPError(400, 'NameLast is less than 2 characters or more than 20 characters');
  }
  const tokenFound = data.tokens.find((obj) => obj.token === token);
  const userIndex = data.users.findIndex((obj) => obj.userId === tokenFound.userId);
  const userFound = data.users.find((user) => user.userId === tokenFound.userId);
  // Checking if email changed
  if (data.users[userIndex].email !== email) {
    data.users[userIndex].email = email;
  }
  // Checking if only nameFirst changed
  if (data.users[userIndex].nameFirst !== nameFirst && data.users[userIndex].nameLast === nameLast) {
    data.users[userIndex].nameFirst = nameFirst;
    data.users[userIndex].name = `${nameFirst} ${userFound.nameLast}`;
  }
  // Checking if only nameLast changed
  if (data.users[userIndex].nameLast !== nameLast && data.users[userIndex].nameFirst === nameFirst) {
    data.users[userIndex].nameLast = nameLast;
    data.users[userIndex].name = `${userFound.nameFirst} ${nameLast}`;
  }
  // Checking if both nameFirst and nameLast changed
  if (data.users[userIndex].nameFirst !== nameFirst && data.users[userIndex].nameLast !== nameLast) {
    data.users[userIndex].nameFirst = nameFirst;
    data.users[userIndex].nameLast = nameLast;
    data.users[userIndex].name = `${nameFirst} ${nameLast}`;
  }
  // Update the data
  setData(data);
  return {};
}

/**
* Given token, old password and new password, update password
* @param {string} token - user's token
* @param {string} oldPassword - user's old password
* @param {string} newPassword - user's new password
* @returns {{}} - empty object
*/
export function adminUserPasswordUpdateV2(token: string, oldPassword: string, newPassword: string) {
  const data = getData();
  // Test to check if token is a string of numbers
  if (!token || typeof token !== 'string') {
    throw HTTPError(401, 'Token is not a valid structure');
  }
  // Checking provided token is valid structure, but is not for a currently logged in session
  const tokenFound = data.tokens.find((user) => user.token === token);
  if (!tokenFound) {
    throw HTTPError(403, 'Provided token is valid structure, but is not for a currently logged in session');
  }
  // Checking old Password is not the correct old password
  const passwordFound = data.users.find((user) => user.password === getHash(oldPassword));
  if (!passwordFound) {
    throw HTTPError(400, 'Old Password is not the correct old password');
  }
  // Checking if Old Password and New Password match exactly
  if (oldPassword === newPassword) {
    throw HTTPError(400, 'Old Password and New Password match exactly');
  }
  // Checking New Password has already been used before by this user
  const usersOldPassword = data.userPassword.find((user) => user.userId === tokenFound.userId);
  const passwordBeenUsed = usersOldPassword.passwordUsedBefore.includes(getHash(newPassword));
  if (passwordBeenUsed) {
    throw HTTPError(400, 'New Password has already been used before by this user');
  }
  // Error checking that the length of password is less than 8 characters
  if (newPassword.length < 8) {
    throw HTTPError(400, 'New Password is less than 8 characters');
  }
  // Error checking that the password has at least one number and one letter
  const hasNumber = /\d/.test(newPassword);
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  if (!hasNumber || !hasLetter) {
    throw HTTPError(400, 'New Password does not contain at least one number and at least one letter');
  }
  const userIndex = data.users.findIndex((user) => user.userId === tokenFound.userId);
  data.users[userIndex].password = getHash(newPassword);
  usersOldPassword.passwordUsedBefore.push(getHash(newPassword));
  setData(data);
  return {};
}
