import request, { HttpVerb } from 'sync-request';
import { port, url } from './config.json';
import { IncomingHttpHeaders } from 'http';
import HTTPError from 'http-errors';

const SERVER_URL = `${url}:${port}`;
const TIMEOUT_MS = 10000;

interface Payload {
  [key: string]: any;
}

// ====================================================================
// ============================= Helpers ==============================
// ====================================================================

const requestHelper = (
  method: HttpVerb,
  path: string,
  payload: Payload,
  headers: IncomingHttpHeaders = {}
): any => {
  let qs = {};
  let json = {};
  if (['GET', 'DELETE'].includes(method.toUpperCase())) {
    qs = payload;
  } else {
    // PUT/POST
    json = payload;
  }

  const url = SERVER_URL + path;
  const res = request(method, url, { qs, json, headers, timeout: TIMEOUT_MS });

  let responseBody: any;
  try {
    responseBody = JSON.parse(res.body.toString());
  } catch (err: any) {
    if (res.statusCode === 200) {
      throw HTTPError(500,
        `Non-jsonifiable body despite code 200: '${res.body}'.\nCheck that you are not doing res.json(undefined) instead of res.json({}), e.g. in '/clear'`
      );
    }
    responseBody = { error: `Failed to parse JSON: '${err.message}'` };
  }

  const errorMessage = `[${res.statusCode}] ` + responseBody?.error || responseBody || 'No message specified!';

  switch (res.statusCode) {
    case 400: // BAD_REQUEST
    case 401: // UNAUTHORIZED
      throw HTTPError(res.statusCode, errorMessage);
    case 404: // NOT_FOUND
      throw HTTPError(res.statusCode, `Cannot find '${url}' [${method}]\nReason: ${errorMessage}\n\nHint: Check that your server.ts have the correct path AND method`);
    case 500: // INTERNAL_SERVER_ERROR
      throw HTTPError(res.statusCode, errorMessage + '\n\nHint: Your server crashed. Check the server log!\n');
    default:
      if (res.statusCode !== 200) {
        throw HTTPError(res.statusCode, errorMessage + `\n\nSorry, no idea! Look up the status code ${res.statusCode} online!\n`);
      }
  }
  return responseBody;
};

// ====================================================================
// ========================= Wrapper functions ========================
// ====================================================================

function clear() {
  return requestHelper('DELETE', '/v1/clear', {});
}

// ====================================================================
// ========================= Protected Routes =========================
// ====================================================================

// ====================== Iter2 (Using iter1) =========================

function adminAuthRegister(email: string, password: string, nameFirst: string, nameLast: string) {
  return requestHelper('POST', '/v1/admin/auth/register', { email, password, nameFirst, nameLast });
}

function adminAuthLogin(email: string, password: string) {
  return requestHelper('POST', '/v1/admin/auth/login', { email, password });
}

function adminUserDetails(token: string) {
  return requestHelper('GET', '/v1/admin/user/details', { token });
}

// ========================= Iter2 (New) ==============================

function adminAuthLogout(token: string) {
  return requestHelper('POST', '/v1/admin/auth/logout', { token });
}

function adminUserDetailsUpdate(token: string, email: string, nameFirst: string, nameLast: string) {
  return requestHelper('PUT', '/v1/admin/user/details', { token, email, nameFirst, nameLast });
}

function adminUserPasswordUpdate(token: string, oldPassword: string, newPassword: string) {
  return requestHelper('PUT', '/v1/admin/user/password', { token, oldPassword, newPassword });
}

// ========================= Iter3 (Modified) =========================

function adminAuthLogoutV2(token: string) {
  return requestHelper('POST', '/v2/admin/auth/logout', {}, { token });
}

function adminUserDetailsV2(token: string) {
  return requestHelper('GET', '/v2/admin/user/details', {}, { token });
}

function adminUserDetailsUpdateV2(token: string, email: string, nameFirst: string, nameLast: string) {
  return requestHelper('PUT', '/v2/admin/user/details', { email, nameFirst, nameLast }, { token });
}

function adminUserPasswordUpdateV2(token: string, oldPassword: string, newPassword: string) {
  return requestHelper('PUT', '/v2/admin/user/password', { oldPassword, newPassword }, { token });
}
// ====================================================================
// ============================ Testing ===============================
// ====================================================================

beforeEach(clear);

// =================== Iter2 (Using iter1) Testing ====================

// adminAuthregister Testing
describe('adminAuthregister', () => {
  describe('success', () => {
    test('successful registration', () => {
      expect(adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker')).toStrictEqual({ token: expect.any(String) });
    });
  });

  describe('failure', () => {
    test('Email address is used by another user', () => {
      expect(() => adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker')).not.toThrow(Error);
      expect(() => adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker')).toThrow(HTTPError[400]);
    });

    test('Email does not satisfy validator', () => {
      expect(() => adminAuthRegister('validEmail@@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker')).toThrow(HTTPError[400]);
    });

    test('NameFirst contains characters other than lowercase letters, uppercase letters, spaces, hyphens, or apostrophes', () => {
      expect(() => adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter#', 'Parker')).toThrow(HTTPError[400]);
    });

    test('NameFirst is less than 2 characters or more than 20 characters', () => {
      expect(() => adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'P', 'Parker')).toThrow(HTTPError[400]);
    });

    test('NameLast contains characters other than lowercase letters, uppercase letters, spaces, hyphens, or apostrophes', () => {
      expect(() => adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker#')).toThrow(HTTPError[400]);
    });

    test('NameLast is less than 2 characters or more than 20 characters', () => {
      expect(() => adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'P')).toThrow(HTTPError[400]);
    });

    test('Password is less than 8 characters', () => {
      expect(() => adminAuthRegister('validEmail@unsw.edu.au', 'ABC123', 'Peter', 'Parker')).toThrow(HTTPError[400]);
    });

    test('Password does not contain at least one number and at least one letter', () => {
      expect(() => adminAuthRegister('validEmail@unsw.edu.au', 'validPassword', 'Peter', 'Parker')).toThrow(HTTPError[400]);
    });
  });
});

// adminAuthLogin Testing
describe('adminAuthLogin', () => {
  describe('success', () => {
    test('successful logging in', () => {
      adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      expect(adminAuthLogin('validEmail@unsw.edu.au', 'validPassword!123')).toStrictEqual({ token: expect.any(String) });
    });
  });

  describe('failure', () => {
    test('Email address does not exist', () => {
      expect(() => adminAuthLogin('validEmail@unsw.edu.au', 'validPassword!123')).toThrow(HTTPError[400]);
    });

    test('Password is not correct for the given email', () => {
      adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      expect(() => adminAuthLogin('validEmail@unsw.edu.au', 'wrongPassword!123')).toThrow(HTTPError[400]);
    });
  });
});

// adminUserDetails Testing
describe('adminUserDetails', () => {
  describe('success', () => {
    test('successful getting details', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      expect(adminUserDetails(token.token)).toStrictEqual({
        user: {
          userId: expect.any(Number),
          name: 'Peter Parker',
          email: 'validEmail@unsw.edu.au',
          numSuccessfulLogins: expect.any(Number),
          numFailedPasswordsSinceLastLogin: expect.any(Number),
        }
      });
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      expect(() => adminUserDetails(undefined)).toThrow(HTTPError[401]);
    });

    test('Provided token is valid structure, but is not for a currently logged in session', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      adminAuthLogout(token.token);
      expect(() => adminUserDetails(token.token)).toThrow(HTTPError[403]);
    });
  });
});

// ======================= Iter2 (New) Testing ========================

// adminAuthLogout Testing
describe('adminAuthLogout', () => {
  describe('success', () => {
    test('successful logging out', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      expect(adminAuthLogout(token.token)).toStrictEqual({});
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      expect(() => adminAuthLogout(undefined)).toThrow(HTTPError[401]);
    });

    test('This token is for a user who has already logged out', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      adminAuthLogout(token.token);
      expect(() => adminAuthLogout(token.token)).toThrow(HTTPError[400]);
    });
  });
});

// adminUserDetailsUpdate Testing
describe('adminUserDetailsUpdate', () => {
  describe('success', () => {
    test('successful updating user details', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const result = adminUserDetailsUpdate(token.token, 'newvalidEmail@unsw.edu.au', 'Taylor', 'Swift');
      expect(result).toStrictEqual({});
      expect(adminUserDetails(token.token)).toStrictEqual({
        user: {
          userId: expect.any(Number),
          name: 'Taylor Swift',
          email: 'newvalidEmail@unsw.edu.au',
          numSuccessfulLogins: expect.any(Number),
          numFailedPasswordsSinceLastLogin: expect.any(Number),
        }
      });
    });

    test('successful updating user details (only nameFirst change)', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const result = adminUserDetailsUpdate(token.token, 'newvalidEmail@unsw.edu.au', 'Taylor', 'Parker');
      expect(result).toStrictEqual({});
      expect(adminUserDetails(token.token)).toStrictEqual({
        user: {
          userId: expect.any(Number),
          name: 'Taylor Parker',
          email: 'newvalidEmail@unsw.edu.au',
          numSuccessfulLogins: expect.any(Number),
          numFailedPasswordsSinceLastLogin: expect.any(Number),
        }
      });
    });

    test('successful updating user details (only nameLast change)', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const result = adminUserDetailsUpdate(token.token, 'newvalidEmail@unsw.edu.au', 'Peter', 'Swift');
      expect(result).toStrictEqual({});
      expect(adminUserDetails(token.token)).toStrictEqual({
        user: {
          userId: expect.any(Number),
          name: 'Peter Swift',
          email: 'newvalidEmail@unsw.edu.au',
          numSuccessfulLogins: expect.any(Number),
          numFailedPasswordsSinceLastLogin: expect.any(Number),
        }
      });
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      expect(() => adminUserDetailsUpdate(undefined, 'newvalidEmail@unsw.edu.au', 'Taylor', 'Swift')).toThrow(HTTPError[401]);
    });

    test('Provided token is valid structure, but is not for a currently logged in session', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      adminAuthLogout(token.token);
      expect(() => adminUserDetailsUpdate(token.token, 'newvalidEmail@unsw.edu.au', 'Taylor', 'Swift')).toThrow(HTTPError[403]);
    });

    test('Email is currently used by another user (excluding the current authorised user)', () => {
      const token1 = adminAuthRegister('firstvalidEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      adminAuthRegister('secondvalidEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      expect(() => adminUserDetailsUpdate(token1.token, 'secondvalidEmail@unsw.edu.au', 'Taylor', 'Swift')).toThrow(HTTPError[400]);
    });

    test('Email does not satisfy validator', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      expect(() => adminUserDetailsUpdate(token.token, 'newvalidEmail@@unsw.edu.au', 'Taylor', 'Swift')).toThrow(HTTPError[400]);
    });

    test('NameFirst contains characters other than lowercase letters, uppercase letters, spaces, hyphens, or apostrophes', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      expect(() => adminUserDetailsUpdate(token.token, 'newvalidEmail@unsw.edu.au', 'Taylor#', 'Swift')).toThrow(HTTPError[400]);
    });

    test('NameFirst is less than 2 characters or more than 20 characters', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      expect(() => adminUserDetailsUpdate(token.token, 'newvalidEmail@unsw.edu.au', 'T', 'Swift')).toThrow(HTTPError[400]);
    });

    test('NameLast contains characters other than lowercase letters, uppercase letters, spaces, hyphens, or apostrophes', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      expect(() => adminUserDetailsUpdate(token.token, 'newvalidEmail@unsw.edu.au', 'Taylor', 'Swift#')).toThrow(HTTPError[400]);
    });

    test('NameLast is less than 2 characters or more than 20 characters', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      expect(() => adminUserDetailsUpdate(token.token, 'newvalidEmail@unsw.edu.au', 'Taylor', 'S')).toThrow(HTTPError[400]);
    });
  });
});

// adminUserPasswordUpdate Testing
describe('adminUserPasswordUpdate', () => {
  describe('successful', () => {
    test('successful updating user password', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const result = adminUserPasswordUpdate(token.token, 'validPassword!123', 'newvalidPassword!123');
      expect(result).toStrictEqual({});
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      expect(() => adminUserPasswordUpdate(undefined, 'validPassword!123', 'newvalidPassword!123')).toThrow(HTTPError[401]);
    });

    test('Provided token is valid structure, but is not for a currently logged in session', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      adminAuthLogout(token.token);
      expect(() => adminUserPasswordUpdate(token.token, 'validPassword!123', 'newvalidPassword!123')).toThrow(HTTPError[403]);
    });

    test('Old Password is not the correct old password', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      expect(() => adminUserPasswordUpdate(token.token, 'wrongPassword!123', 'newvalidPassword!123')).toThrow(HTTPError[400]);
    });

    test('Old Password and New Password match exactly', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      expect(() => adminUserPasswordUpdate(token.token, 'validPassword!123', 'validPassword!123')).toThrow(HTTPError[400]);
    });

    test('New Password has already been used before by this user', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      adminUserPasswordUpdate(token.token, 'validPassword!123', 'newvalidPassword!123');
      expect(() => adminUserPasswordUpdate(token.token, 'newvalidPassword!123', 'validPassword!123')).toThrow(HTTPError[400]);
    });

    test('New Password is less than 8 characters', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      expect(() => adminUserPasswordUpdate(token.token, 'validPassword!123', 'wrong1!')).toThrow(HTTPError[400]);
    });

    test('New Password does not contain at least one number and at least one letter', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      expect(() => adminUserPasswordUpdate(token.token, 'validPassword!123', 'invalidPassword')).toThrow(HTTPError[400]);
    });
  });
});

// ================== Iter3 (Modified) Testing ========================

// adminAuthLogoutV2 Testing
describe('adminAuthLogoutV2', () => {
  describe('success', () => {
    test('successful logging out', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      expect(adminAuthLogoutV2(token.token)).toStrictEqual({});
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      expect(() => adminAuthLogoutV2(undefined)).toThrow(HTTPError[401]);
    });

    test('This token is for a user who has already logged out', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      adminAuthLogout(token.token);
      expect(() => adminAuthLogoutV2(token.token)).toThrow(HTTPError[400]);
    });
  });
});

// adminUserDetailsV2 Testing
describe('adminUserDetailsV2', () => {
  describe('success', () => {
    test('successful getting details', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      expect(adminUserDetailsV2(token.token)).toStrictEqual({
        user: {
          userId: expect.any(Number),
          name: 'Peter Parker',
          email: 'validEmail@unsw.edu.au',
          numSuccessfulLogins: expect.any(Number),
          numFailedPasswordsSinceLastLogin: expect.any(Number),
        }
      });
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      expect(() => adminUserDetailsV2(undefined)).toThrow(HTTPError[401]);
    });

    test('Provided token is valid structure, but is not for a currently logged in session', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      adminAuthLogout(token.token);
      expect(() => adminUserDetailsV2(token.token)).toThrow(HTTPError[403]);
    });
  });
});

// adminUserDetailsUpdateV2 Testing
describe('adminUserDetailsUpdateV2', () => {
  describe('success', () => {
    test('successful updating user details', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const result = adminUserDetailsUpdateV2(token.token, 'newvalidEmail@unsw.edu.au', 'Taylor', 'Swift');
      expect(result).toStrictEqual({});
      expect(adminUserDetailsV2(token.token)).toStrictEqual({
        user: {
          userId: expect.any(Number),
          name: 'Taylor Swift',
          email: 'newvalidEmail@unsw.edu.au',
          numSuccessfulLogins: expect.any(Number),
          numFailedPasswordsSinceLastLogin: expect.any(Number),
        }
      });
    });

    test('successful updating user details (only nameFirst change)', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const result = adminUserDetailsUpdateV2(token.token, 'newvalidEmail@unsw.edu.au', 'Taylor', 'Parker');
      expect(result).toStrictEqual({});
      expect(adminUserDetailsV2(token.token)).toStrictEqual({
        user: {
          userId: expect.any(Number),
          name: 'Taylor Parker',
          email: 'newvalidEmail@unsw.edu.au',
          numSuccessfulLogins: expect.any(Number),
          numFailedPasswordsSinceLastLogin: expect.any(Number),
        }
      });
    });

    test('successful updating user details, (only nameLast change)', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const result = adminUserDetailsUpdateV2(token.token, 'newvalidEmail@unsw.edu.au', 'Peter', 'Swift');
      expect(result).toStrictEqual({});
      expect(adminUserDetailsV2(token.token)).toStrictEqual({
        user: {
          userId: expect.any(Number),
          name: 'Peter Swift',
          email: 'newvalidEmail@unsw.edu.au',
          numSuccessfulLogins: expect.any(Number),
          numFailedPasswordsSinceLastLogin: expect.any(Number),
        }
      });
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      expect(() => adminUserDetailsUpdateV2(undefined, 'newvalidEmail@unsw.edu.au', 'Taylor', 'Swift')).toThrow(HTTPError[401]);
    });

    test('Provided token is valid structure, but is not for a currently logged in session', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      adminAuthLogout(token.token);
      expect(() => adminUserDetailsUpdateV2(token.token, 'newvalidEmail@unsw.edu.au', 'Taylor', 'Swift')).toThrow(HTTPError[403]);
    });

    test('Email is currently used by another user (excluding the current authorised user)', () => {
      const token1 = adminAuthRegister('firstvalidEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      adminAuthRegister('secondvalidEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      expect(() => adminUserDetailsUpdateV2(token1.token, 'secondvalidEmail@unsw.edu.au', 'Taylor', 'Swift')).toThrow(HTTPError[400]);
    });

    test('Email does not satisfy validator', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      expect(() => adminUserDetailsUpdateV2(token.token, 'newvalidEmail@@unsw.edu.au', 'Taylor', 'Swift')).toThrow(HTTPError[400]);
    });

    test('NameFirst contains characters other than lowercase letters, uppercase letters, spaces, hyphens, or apostrophes', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      expect(() => adminUserDetailsUpdateV2(token.token, 'newvalidEmail@unsw.edu.au', 'Taylor#', 'Swift')).toThrow(HTTPError[400]);
    });

    test('NameFirst is less than 2 characters or more than 20 characters', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      expect(() => adminUserDetailsUpdateV2(token.token, 'newvalidEmail@unsw.edu.au', 'T', 'Swift')).toThrow(HTTPError[400]);
    });

    test('NameLast contains characters other than lowercase letters, uppercase letters, spaces, hyphens, or apostrophes', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      expect(() => adminUserDetailsUpdateV2(token.token, 'newvalidEmail@unsw.edu.au', 'Taylor', 'Swift#')).toThrow(HTTPError[400]);
    });

    test('NameLast is less than 2 characters or more than 20 characters', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      expect(() => adminUserDetailsUpdateV2(token.token, 'newvalidEmail@unsw.edu.au', 'Taylor', 'S')).toThrow(HTTPError[400]);
    });
  });
});

// adminUserPasswordUpdateV2 Testing
describe('adminUserPasswordUpdateV2', () => {
  describe('successful', () => {
    test('successful updating user password', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const result = adminUserPasswordUpdateV2(token.token, 'validPassword!123', 'newvalidPassword!123');
      expect(result).toStrictEqual({});
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      expect(() => adminUserPasswordUpdateV2(undefined, 'validPassword!123', 'newvalidPassword!123')).toThrow(HTTPError[401]);
    });

    test('Provided token is valid structure, but is not for a currently logged in session', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      adminAuthLogout(token.token);
      expect(() => adminUserPasswordUpdateV2(token.token, 'validPassword!123', 'newvalidPassword!123')).toThrow(HTTPError[403]);
    });

    test('Old Password is not the correct old password', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      expect(() => adminUserPasswordUpdateV2(token.token, 'wrongPassword!123', 'newvalidPassword!123')).toThrow(HTTPError[400]);
    });

    test('Old Password and New Password match exactly', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      expect(() => adminUserPasswordUpdateV2(token.token, 'validPassword!123', 'validPassword!123')).toThrow(HTTPError[400]);
    });

    test('New Password has already been used before by this user', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      adminUserPasswordUpdate(token.token, 'validPassword!123', 'newvalidPassword!123');
      expect(() => adminUserPasswordUpdateV2(token.token, 'newvalidPassword!123', 'validPassword!123')).toThrow(HTTPError[400]);
    });

    test('New Password is less than 8 characters', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      expect(() => adminUserPasswordUpdateV2(token.token, 'validPassword!123', 'wrong1!')).toThrow(HTTPError[400]);
    });

    test('New Password does not contain at least one number and at least one letter', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      expect(() => adminUserPasswordUpdateV2(token.token, 'validPassword!123', 'invalidPassword')).toThrow(HTTPError[400]);
    });
  });
});
