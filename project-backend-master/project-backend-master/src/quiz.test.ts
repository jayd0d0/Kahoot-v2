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

function sleepSync(ms: number) {
  const startTime = new Date().getTime();
  while (new Date().getTime() - startTime < ms) {
    // zzzZZ - comment needed so eslint doesn't complain
  }
}

// ====================================================================
// ========================= Wrapper functions ========================
// ====================================================================

function clear() {
  return requestHelper('DELETE', '/v1/clear', {});
}

function adminAuthRegister(email: string, password: string, nameFirst: string, nameLast: string) {
  return requestHelper('POST', '/v1/admin/auth/register', { email, password, nameFirst, nameLast });
}

function adminAuthLogout(token: string) {
  return requestHelper('POST', '/v1/admin/auth/logout', { token });
}

function adminAuthLogoutV2(token: string) {
  return requestHelper('POST', '/v2/admin/auth/logout', {}, { token });
}
// ====================================================================
// ========================= Protected Routes =========================
// ====================================================================

// ====================== Iter2 (Using iter1) =========================

function adminQuizList(token: string) {
  return requestHelper('GET', '/v1/admin/quiz/list', { token });
}

function adminQuizCreate(token: string, name: string, description: string) {
  return requestHelper('POST', '/v1/admin/quiz', { token, name, description });
}

function adminQuizRemove(quizId: number, token: string) {
  return requestHelper('DELETE', `/v1/admin/quiz/${quizId}`, { token });
}

function adminQuizInfo(quizId: number, token: string) {
  return requestHelper('GET', `/v1/admin/quiz/${quizId}`, { token });
}

function adminQuizNameUpdate(quizId: number, token: string, name: string) {
  return requestHelper('PUT', `/v1/admin/quiz/${quizId}/name`, { token, name });
}

function adminQuizDescriptionUpdate(quizId: number, token: string, description: string) {
  return requestHelper('PUT', `/v1/admin/quiz/${quizId}/description`, { token, description });
}

// ========================= Iter2 (New) ==============================

function adminQuizTrashView(token: string) {
  return requestHelper('GET', '/v1/admin/quiz/trash', { token });
}

function adminQuizRestore(quizId: number, token: string) {
  return requestHelper('POST', `/v1/admin/quiz/${quizId}/restore`, { token });
}

function adminQuizTrashEmpty(token: string, quizIds: number[]) {
  return requestHelper('DELETE', '/v1/admin/quiz/trash/empty', { token, quizIds });
}

function adminQuizTransfer(quizId: number, token: string, userEmail: string) {
  return requestHelper('POST', `/v1/admin/quiz/${quizId}/transfer`, { token, userEmail });
}

function adminQuizQuestionCreate(quizId: number, token: string, questionBody: {question: string, duration: number, points: number, answers: {answer: string, correct: boolean}[]}) {
  return requestHelper('POST', `/v1/admin/quiz/${quizId}/question`, { token, questionBody });
}

function adminQuizQuestionUpdate(quizId: number, questionId: number, token: string, questionBody: {question: string, duration: number, points: number, answers: {answer: string, correct: boolean}[]}) {
  return requestHelper('PUT', `/v1/admin/quiz/${quizId}/question/${questionId}`, { token, questionBody });
}

function adminQuizQuestionRemove(quizId: number, questionId: number, token: string) {
  return requestHelper('DELETE', `/v1/admin/quiz/${quizId}/question/${questionId}`, { token });
}

function adminQuizQuestionMove(quizId: number, questionId: number, token: string, newPosition: number) {
  return requestHelper('PUT', `/v1/admin/quiz/${quizId}/question/${questionId}/move`, { token, newPosition });
}

function adminQuizQuestionDuplicate(quizId: number, questionId: number, token: string) {
  return requestHelper('POST', `/v1/admin/quiz/${quizId}/question/${questionId}/duplicate`, { token });
}

// ========================= Iter3 (Modified) =========================

function adminQuizListV2(token: string) {
  return requestHelper('GET', '/v2/admin/quiz/list', {}, { token });
}

function adminQuizCreateV2(token: string, name: string, description: string) {
  return requestHelper('POST', '/v2/admin/quiz', { name, description }, { token });
}

function adminQuizRemoveV2(quizId: number, token: string) {
  return requestHelper('DELETE', `/v2/admin/quiz/${quizId}`, {}, { token });
}

function adminQuizInfoV2(quizId: number, token: string) {
  return requestHelper('GET', `/v2/admin/quiz/${quizId}`, {}, { token });
}

function adminQuizNameUpdateV2(quizId: number, token: string, name: string) {
  return requestHelper('PUT', `/v2/admin/quiz/${quizId}/name`, { name }, { token });
}

function adminQuizDescriptionUpdateV2(quizId: number, token: string, description: string) {
  return requestHelper('PUT', `/v2/admin/quiz/${quizId}/description`, { description }, { token });
}

function adminQuizTrashViewV2(token: string) {
  return requestHelper('GET', '/v2/admin/quiz/trash', {}, { token });
}

function adminQuizRestoreV2(quizId: number, token: string) {
  return requestHelper('POST', `/v2/admin/quiz/${quizId}/restore`, {}, { token });
}

function adminQuizTrashEmptyV2(token: string, quizIds: number[]) {
  return requestHelper('DELETE', '/v2/admin/quiz/trash/empty', { quizIds }, { token });
}

function adminQuizTransferV2(quizId: number, token: string, userEmail: string) {
  return requestHelper('POST', `/v2/admin/quiz/${quizId}/transfer`, { userEmail }, { token });
}

function adminQuizQuestionCreateV2(quizId: number, token: string, questionBody: {question: string, duration: number, points: number, answers: {answer: string, correct: boolean}[], thumbnailUrl: string}) {
  return requestHelper('POST', `/v2/admin/quiz/${quizId}/question`, { questionBody }, { token });
}

function adminQuizQuestionUpdateV2(quizId: number, questionId: number, token: string, questionBody: {question: string, duration: number, points: number, answers: {answer: string, correct: boolean}[], thumbnailUrl: string}) {
  return requestHelper('PUT', `/v2/admin/quiz/${quizId}/question/${questionId}`, { questionBody }, { token });
}

function adminQuizQuestionRemoveV2(quizId: number, questionId: number, token: string) {
  return requestHelper('DELETE', `/v2/admin/quiz/${quizId}/question/${questionId}`, {}, { token });
}

function adminQuizQuestionMoveV2(quizId: number, questionId: number, token: string, newPosition: number) {
  return requestHelper('PUT', `/v2/admin/quiz/${quizId}/question/${questionId}/move`, { newPosition }, { token });
}

function adminQuizQuestionDuplicateV2(quizId: number, questionId: number, token: string) {
  return requestHelper('POST', `/v2/admin/quiz/${quizId}/question/${questionId}/duplicate`, {}, { token });
}
// ========================= Iter3 (New) =============================

function adminQuizThumbnailUpdate(quizId: number, token: string, imgUrl: string) {
  return requestHelper('PUT', `/v1/admin/quiz/${quizId}/thumbnail`, { imgUrl }, { token });
}

function adminQuizSessionView(token: string, quizId: number) {
  return requestHelper('GET', `/v1/admin/quiz/${quizId}/sessions`, {}, { token });
}

function adminQuizSessionStart(quizId: number, token: string, autoStartNum: number) {
  return requestHelper('POST', `/v1/admin/quiz/${quizId}/session/start`, { autoStartNum }, { token });
}

function adminQuizSessionUpdate(quizId: number, sessionId: number, token: string, action: string) {
  return requestHelper('PUT', `/v1/admin/quiz/${quizId}/session/${sessionId}`, { action }, { token });
}

function adminQuizSessionStatus(quizId: number, sessionId: number, token: string) {
  return requestHelper('GET', `/v1/admin/quiz/${quizId}/session/${sessionId}`, {}, { token });
}

function adminQuizSessionResult(quizId: number, sessionId: number, token: string) {
  return requestHelper('GET', `/v1/admin/quiz/${quizId}/session/${sessionId}/results`, {}, { token });
}

function adminQuizSessionResultCSV(quizId: number, sessionId: number, token: string) {
  return requestHelper('GET', `/v1/admin/quiz/${quizId}/session/${sessionId}/results/csv`, {}, { token });
}

function guestPlayerJoin(sessionId: number, name: string) {
  return requestHelper('POST', '/v1/player/join', { sessionId, name }, {});
}

function guestPlayerStatus(playerId: number) {
  return requestHelper('GET', `/v1/player/${playerId}`, {}, {});
}

function guestPlayerQuestionInfo(playerId: number, questionposition: number) {
  return requestHelper('GET', `/v1/player/${playerId}/question/${questionposition}`, {}, {});
}

function guestPlayerAnswerSubmit(answerIds: number[], playerId: number, questionposition: number) {
  return requestHelper('PUT', `/v1/player/${playerId}/question/${questionposition}/answer`, { answerIds }, {});
}

function guestPlayerResult(playerId: number, questionposition: number) {
  return requestHelper('GET', `/v1/player/${playerId}/question/${questionposition}/results`, {}, {});
}

function guestPlayerSessionResult(playerId: number) {
  return requestHelper('GET', `/v1/player/${playerId}/results`, {}, {});
}

function playerMessageView(playerId: number) {
  return requestHelper('GET', `/v1/player/${playerId}/chat`, {}, {});
}

function playerMessageSend(playerId: number, message: { messageBody: string }) {
  return requestHelper('POST', `/v1/player/${playerId}/chat`, { message }, {});
}

// ====================================================================
// ============================ Testing ===============================
// ====================================================================

beforeEach(clear);

// =================== Iter2 (Using iter1) Testing ====================

// adminQuizList Testing
describe('adminQuizList', () => {
  describe('success', () => {
    test('successful getting quiz list', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      expect(adminQuizList(token.token)).toStrictEqual({
        quizzes: [
          {
            quizId: quiz.quizId,
            name: 'valid quiz name',
          },
        ]
      });
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      expect(() => adminQuizList(undefined)).toThrow(HTTPError[401]);
    });

    test('Provided token is valid structure, but is not for a currently logged in session', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      adminAuthLogout(token.token);
      expect(() => adminQuizList(token.token)).toThrow(HTTPError[403]);
    });
  });
});

// adminQuizCreate Testing
describe('adminQuizCreate', () => {
  describe('success', () => {
    test('successful creating quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      expect(quiz).toStrictEqual({ quizId: expect.any(Number) });
      expect(adminQuizInfo(quiz.quizId, token.token)).toStrictEqual({
        quizId: quiz.quizId,
        name: 'valid quiz name',
        timeCreated: expect.any(Number),
        timeLastEdited: expect.any(Number),
        description: 'valid quiz description',
        numQuestions: 0,
        questions: [],
        duration: 0,
      });
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      expect(() => adminQuizCreate(undefined, 'valid quiz name', 'valid quiz description')).toThrow(HTTPError[401]);
    });

    test('Provided token is valid structure, but is not for a currently logged in session', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      adminAuthLogout(token.token);
      expect(() => adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description')).toThrow(HTTPError[403]);
    });

    test('Name contains invalid characters. Valid characters are alphanumeric and spaces', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      expect(() => adminQuizCreate(token.token, 'invalid quiz name#', 'valid quiz description')).toThrow(HTTPError[400]);
    });

    test('Name is either less than 3 characters long or more than 30 characters long', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      expect(() => adminQuizCreate(token.token, 'in', 'valid quiz description')).toThrow(HTTPError[400]);
    });

    test('Name is already used by the current logged in user for another quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description')).toThrow(HTTPError[400]);
    });

    test('Description is more than 100 characters in length (note: empty strings are OK)', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      expect(() => adminQuizCreate(token.token, 'valid quiz name', 'description too long aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')).toThrow(HTTPError[400]);
    });
  });
});

// adminQuizRemove Testing
describe('adminQuizRemove', () => {
  describe('success', () => {
    test('successful removing quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      expect(adminQuizRemove(quiz.quizId, token.token)).toStrictEqual({});
      expect(adminQuizList(token.token)).toStrictEqual({
        quizzes: []
      });
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizRemove(quiz.quizId, undefined)).toThrow(HTTPError[401]);
    });

    test('Provided token is valid structure, but is not for a currently logged in session', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      adminAuthLogout(token.token);
      expect(() => adminQuizRemove(quiz.quizId, token.token)).toThrow(HTTPError[403]);
    });

    test('Quiz ID does not refer to a valid quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizRemove(quiz.quizId + 1, token.token)).toThrow(HTTPError[400]);
    });

    test('Quiz ID does not refer to a quiz that this user owns', () => {
      const token1 = adminAuthRegister('validEmail1@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const token2 = adminAuthRegister('validEmail2@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token1.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizRemove(quiz.quizId, token2.token)).toThrow(HTTPError[400]);
    });
  });
});

// adminQuizInfo Testing
describe('adminQuizInfo', () => {
  describe('success', () => {
    test('successful getting quiz info', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      expect(adminQuizInfo(quiz.quizId, token.token)).toStrictEqual({
        quizId: quiz.quizId,
        name: 'valid quiz name',
        timeCreated: expect.any(Number),
        timeLastEdited: expect.any(Number),
        description: 'valid quiz description',
        numQuestions: 0,
        questions: [],
        duration: 0,
      });
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizInfo(quiz.quizId, undefined)).toThrow(HTTPError[401]);
    });

    test('Provided token is valid structure, but is not for a currently logged in session', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      adminAuthLogout(token.token);
      expect(() => adminQuizInfo(quiz.quizId, token.token)).toThrow(HTTPError[403]);
    });

    test('Quiz ID does not refer to a valid quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizInfo(quiz.quizId + 1, token.token)).toThrow(HTTPError[400]);
    });

    test('Quiz ID does not refer to a quiz that this user owns', () => {
      const token1 = adminAuthRegister('validEmail1@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const token2 = adminAuthRegister('validEmail2@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token1.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizInfo(quiz.quizId, token2.token)).toThrow(HTTPError[400]);
    });
  });
});

// adminQuizNameUpdate Testing
describe('adminQuizNameUpdate', () => {
  describe('success', () => {
    test('success updating quiz name', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const result = adminQuizNameUpdate(quiz.quizId, token.token, 'new valid quiz name');
      expect(result).toStrictEqual({});
      expect(adminQuizInfo(quiz.quizId, token.token)).toStrictEqual({
        quizId: quiz.quizId,
        name: 'new valid quiz name',
        timeCreated: expect.any(Number),
        timeLastEdited: expect.any(Number),
        description: 'valid quiz description',
        numQuestions: 0,
        questions: [],
        duration: 0,
      });
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizNameUpdate(quiz.quizId, undefined, 'new valid quiz name')).toThrow(HTTPError[401]);
    });

    test('Provided token is valid structure, but is not for a currently logged in session', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      adminAuthLogout(token.token);
      expect(() => adminQuizNameUpdate(quiz.quizId, token.token, 'new valid quiz name')).toThrow(HTTPError[403]);
    });

    test('Quiz ID does not refer to a valid quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizNameUpdate(quiz.quizId + 1, token.token, 'new valid quiz name')).toThrow(HTTPError[400]);
    });

    test('Quiz ID does not refer to a quiz that this user owns', () => {
      const token1 = adminAuthRegister('validEmail1@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const token2 = adminAuthRegister('validEmail2@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token1.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizNameUpdate(quiz.quizId, token2.token, 'new valid quiz name')).toThrow(HTTPError[400]);
    });

    test('Name contains invalid characters. Valid characters are alphanumeric and spaces', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizNameUpdate(quiz.quizId, token.token, 'invalid quiz name#')).toThrow(HTTPError[400]);
    });

    test('Name is either less than 3 characters long or more than 30 characters long', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizNameUpdate(quiz.quizId, token.token, 'in')).toThrow(HTTPError[400]);
    });

    test('Name is already used by the current logged in user for another quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name 1', 'valid quiz description');
      adminQuizCreate(token.token, 'valid quiz name 2', 'valid quiz description');
      expect(() => adminQuizNameUpdate(quiz.quizId, token.token, 'valid quiz name 2')).toThrow(HTTPError[400]);
    });
  });
});

// adminQuizDescriptionUpdate Testing
describe('adminQuizDescriptionUpdate', () => {
  describe('success', () => {
    test('successful quiz description update', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const result = adminQuizDescriptionUpdate(quiz.quizId, token.token, 'new valid quiz description');
      expect(result).toStrictEqual({});
      expect(adminQuizInfo(quiz.quizId, token.token)).toStrictEqual({
        quizId: quiz.quizId,
        name: 'valid quiz name',
        timeCreated: expect.any(Number),
        timeLastEdited: expect.any(Number),
        description: 'new valid quiz description',
        numQuestions: 0,
        questions: [],
        duration: 0,
      });
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizDescriptionUpdate(quiz.quizId, undefined, 'new valid quiz description')).toThrow(HTTPError[401]);
    });

    test('Provided token is valid structure, but is not for a currently logged in session', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      adminAuthLogout(token.token);
      expect(() => adminQuizDescriptionUpdate(quiz.quizId, token.token, 'new valid quiz description')).toThrow(HTTPError[403]);
    });

    test('Quiz ID does not refer to a valid quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizDescriptionUpdate(quiz.quizId + 1, token.token, 'new valid quiz description')).toThrow(HTTPError[400]);
    });

    test('Quiz ID does not refer to a quiz that this user owns', () => {
      const token1 = adminAuthRegister('validEmail1@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const token2 = adminAuthRegister('validEmail2@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token1.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizDescriptionUpdate(quiz.quizId, token2.token, 'new valid quiz description')).toThrow(HTTPError[400]);
    });

    test('Description is more than 100 characters in length (note: empty strings are OK)', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizDescriptionUpdate(quiz.quizId, token.token, 'invalid quiz description aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')).toThrow(HTTPError[400]);
    });
  });
});

// ========================= Iter2 (New) Testing =========================

// adminQuizTrashView Testing
describe('adminQuizTrashView', () => {
  describe('success', () => {
    test('successful view quizTrash', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizRemove(quiz.quizId, token.token);
      expect(adminQuizTrashView(token.token)).toStrictEqual({
        quizzes: [
          {
            quizId: quiz.quizId,
            name: 'valid quiz name',
          }
        ]
      });
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizRemove(quiz.quizId, token.token);
      expect(() => adminQuizTrashView(undefined)).toThrow(HTTPError[401]);
    });

    test('Provided token is valid structure, but is not for a currently logged in session', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizRemove(quiz.quizId, token.token);
      adminAuthLogout(token.token);
      expect(() => adminQuizTrashView(token.token)).toThrow(HTTPError[403]);
    });
  });
});

// adminQuizRestore Testing
describe('adminQuizRestore', () => {
  describe('success', () => {
    test('successful restoring a quiz from trash', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizRemove(quiz.quizId, token.token);
      const result = adminQuizRestore(quiz.quizId, token.token);
      expect(result).toStrictEqual({});
      expect(adminQuizList(token.token)).toStrictEqual({
        quizzes: [
          {
            quizId: quiz.quizId,
            name: 'valid quiz name',
          },
        ]
      });
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizRemove(quiz.quizId, token.token);
      expect(() => adminQuizRestore(quiz.quizId, undefined)).toThrow(HTTPError[401]);
    });

    test('Provided token is valid structure, but is not for a currently logged in session', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizRemove(quiz.quizId, token.token);
      adminAuthLogout(token.token);
      expect(() => adminQuizRestore(quiz.quizId, token.token)).toThrow(HTTPError[403]);
    });

    test('Quiz ID does not refer to a valid quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizRemove(quiz.quizId, token.token);
      expect(() => adminQuizRestore(quiz.quizId + 1, token.token)).toThrow(HTTPError[400]);
    });

    test('Quiz ID does not refer to a quiz that this user owns', () => {
      const token1 = adminAuthRegister('validEmail1@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const token2 = adminAuthRegister('validEmail2@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token1.token, 'valid quiz name', 'valid quiz description');
      adminQuizRemove(quiz.quizId, token1.token);
      expect(() => adminQuizRestore(quiz.quizId, token2.token)).toThrow(HTTPError[400]);
    });

    test('Quiz ID refers to a quiz that is not currently in the trash', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizRestore(quiz.quizId, token.token)).toThrow(HTTPError[400]);
    });
  });
});

// adminQuizTrashEmpty Testing
describe('adminQuizTrashEmpty', () => {
  describe('success', () => {
    test('successful deleting quizzes currently in trash', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz1 = adminQuizCreate(token.token, 'valid quiz name 1', 'valid quiz description');
      const quiz2 = adminQuizCreate(token.token, 'valid quiz name 2', 'valid quiz description');
      const quiz3 = adminQuizCreate(token.token, 'valid quiz name 3', 'valid quiz description');
      adminQuizRemove(quiz1.quizId, token.token);
      adminQuizRemove(quiz2.quizId, token.token);
      adminQuizRemove(quiz3.quizId, token.token);
      expect(adminQuizTrashEmpty(token.token, [quiz1.quizId, quiz2.quizId, quiz3.quizId])).toStrictEqual({});
      expect(adminQuizTrashView(token.token)).toStrictEqual({
        quizzes: []
      });
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name 1', 'valid quiz description');
      adminQuizRemove(quiz.quizId, token.token);
      expect(() => adminQuizTrashEmpty(undefined, quiz.quizId)).toThrow(HTTPError[401]);
    });

    test('Provided token is valid structure, but is not for a currently logged in session', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name 1', 'valid quiz description');
      adminQuizRemove(quiz.quizId, token.token);
      adminAuthLogout(token.token);
      expect(() => adminQuizTrashEmpty(token.token, quiz.quizId)).toThrow(HTTPError[403]);
    });

    test('One or more of the Quiz IDs is not a valid quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name 1', 'valid quiz description');
      adminQuizRemove(quiz.quizId, token.token);
      expect(() => adminQuizTrashEmpty(token.token, quiz.quizId + 1)).toThrow(HTTPError[400]);
    });

    test('One or more of the Quiz IDs refers to a quiz that this current user does not own', () => {
      const token1 = adminAuthRegister('validEmail1@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const token2 = adminAuthRegister('validEmail2@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token1.token, 'valid quiz name 1', 'valid quiz description');
      adminQuizRemove(quiz.quizId, token1.token);
      expect(() => adminQuizTrashEmpty(token2.token, quiz.quizId)).toThrow(HTTPError[400]);
    });

    test('One or more of the Quiz IDs is not currently in the trash', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name 1', 'valid quiz description');
      expect(() => adminQuizTrashEmpty(token.token, quiz.quizId)).toThrow(HTTPError[400]);
    });
  });
});

// adminQuizTransfer Testing
describe('adminQuizTransfer', () => {
  describe('success', () => {
    test('successful transfering quiz', () => {
      const token1 = adminAuthRegister('validEmail1@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const token2 = adminAuthRegister('validEmail2@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token1.token, 'valid quiz name', 'valid quiz description');
      expect(adminQuizTransfer(quiz.quizId, token1.token, 'validEmail2@unsw.edu.au')).toStrictEqual({});
      expect(adminQuizList(token2.token)).toStrictEqual({
        quizzes: [
          {
            quizId: quiz.quizId,
            name: 'valid quiz name'
          },
        ]
      });
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      const token = adminAuthRegister('validEmail1@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      adminAuthRegister('validEmail2@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizTransfer(quiz.quizId, undefined, 'validEmail2@unsw.edu.au')).toThrow(HTTPError[401]);
    });

    test('Provided token is valid structure, but is not for a currently logged in session', () => {
      const token = adminAuthRegister('validEmail1@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      adminAuthRegister('validEmail2@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      adminAuthLogout(token.token);
      expect(() => adminQuizTransfer(quiz.quizId, token.token, 'validEmail2@unsw.edu.au')).toThrow(HTTPError[403]);
    });

    test('Quiz ID does not refer to a valid quiz', () => {
      const token = adminAuthRegister('validEmail1@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      adminAuthRegister('validEmail2@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizTransfer(quiz.quizId + 1, token.token, 'validEmail2@unsw.edu.au')).toThrow(HTTPError[400]);
    });

    test('Quiz ID does not refer to a quiz that this user owns', () => {
      const token1 = adminAuthRegister('validEmail1@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const token2 = adminAuthRegister('validEmail2@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token1.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizTransfer(quiz.quizId, token2.token, 'validEmail2@unsw.edu.au')).toThrow(HTTPError[400]);
    });

    test('userEmail is not a real user', () => {
      const token = adminAuthRegister('validEmail1@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      adminAuthRegister('validEmail2@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizTransfer(quiz.quizId, token.token, 'invalidEmail@unsw.edu.au')).toThrow(HTTPError[400]);
    });

    test('userEmail is the current logged in user', () => {
      const token = adminAuthRegister('validEmail1@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      adminAuthRegister('validEmail2@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizTransfer(quiz.quizId, token.token, 'validEmail1@unsw.edu.au')).toThrow(HTTPError[400]);
    });

    test('Quiz ID refers to a quiz that has a name that is already used by the target user', () => {
      const token1 = adminAuthRegister('validEmail1@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const token2 = adminAuthRegister('validEmail2@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz1 = adminQuizCreate(token1.token, 'valid quiz name', 'valid quiz description');
      adminQuizCreate(token2.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizTransfer(quiz1.quizId, token1.token, 'validEmail2@unsw.edu.au')).toThrow(HTTPError[400]);
    });

    test('All sessions for this quiz must be in END state', () => {
      const token1 = adminAuthRegister('validEmail1@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      adminAuthRegister('validEmail2@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token1.token, 'valid quiz name', 'valid quiz description');
      const questionBody = {
        question: 'how hard iter3 is',
        duration: 20,
        points: 5,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
          {
            answer: 'super hard',
            correct: true
          },
          {
            answer: 'hard',
            correct: false,
          }
        ]
      };
      adminQuizQuestionCreate(quiz.quizId, token1.token, questionBody);
      adminQuizSessionStart(quiz.quizId, token1.token, 3);
      expect(() => adminQuizTransfer(quiz.quizId, token1.token, 'validEmail2@unsw.edu.au')).toThrow(HTTPError[400]);
    });

    // test('All sessions for this quiz must be in END state', () => {
    //   const token = adminAuthRegister('validEmail1@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
    //   adminAuthRegister('validEmail2@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
    //   const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
    //   expect(() => adminQuizTransfer(quiz.quizId, undefined, 'validEmail2@unsw.edu.au')).toThrow(HTTPError[401]);
    // });
  });
});

// adminQuizQuestionCreate Testing
describe('adminQuizQuestionCreate', () => {
  describe('success', () => {
    test('successful creating a question', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const questionBody = {
        question: 'how hard iter3 is',
        duration: 20,
        points: 5,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
          {
            answer: 'super hard',
            correct: true
          },
          {
            answer: 'hard',
            correct: false,
          }
        ]
      };
      expect(adminQuizQuestionCreate(quiz.quizId, token.token, questionBody)).toStrictEqual({ questionId: expect.any(Number) });
      expect(adminQuizInfo(quiz.quizId, token.token)).toStrictEqual({
        quizId: quiz.quizId,
        name: 'valid quiz name',
        timeCreated: expect.any(Number),
        timeLastEdited: expect.any(Number),
        description: 'valid quiz description',
        numQuestions: expect.any(Number),
        questions: [
          {
            questionId: expect.any(Number),
            question: 'how hard iter3 is',
            duration: 20,
            points: 5,
            answers: [
              {
                answerId: expect.any(Number),
                answer: 'super easy',
                colour: expect.any(String),
                correct: false,
              },
              {
                answerId: expect.any(Number),
                answer: 'super hard',
                colour: expect.any(String),
                correct: true
              },
              {
                answerId: expect.any(Number),
                answer: 'hard',
                colour: expect.any(String),
                correct: false,
              }
            ]
          }
        ],
        duration: expect.any(Number),
      });
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const questionBody = {
        question: 'how hard iter3 is',
        duration: 20,
        points: 5,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
          {
            answer: 'super hard',
            correct: true
          },
          {
            answer: 'hard',
            correct: false,
          }
        ]
      };
      expect(() => adminQuizQuestionCreate(quiz.quizId, undefined, questionBody)).toThrow(HTTPError[401]);
    });

    test('Provided token is valid structure, but is not for a currently logged in session', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const questionBody = {
        question: 'how hard iter3 is',
        duration: 20,
        points: 5,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
          {
            answer: 'super hard',
            correct: true
          },
          {
            answer: 'hard',
            correct: false,
          }
        ]
      };
      adminAuthLogout(token.token);
      expect(() => adminQuizQuestionCreate(quiz.quizId, token.token, questionBody)).toThrow(HTTPError[403]);
    });

    test('Quiz ID does not refer to a valid quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const questionBody = {
        question: 'how hard iter3 is',
        duration: 20,
        points: 5,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
          {
            answer: 'super hard',
            correct: true
          },
          {
            answer: 'hard',
            correct: false,
          }
        ]
      };
      expect(() => adminQuizQuestionCreate(quiz.quizId + 1, token.token, questionBody)).toThrow(HTTPError[400]);
    });

    test('Quiz ID does not refer to a quiz that this user owns', () => {
      const token1 = adminAuthRegister('validEmail1@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const token2 = adminAuthRegister('validEmail2@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token1.token, 'valid quiz name', 'valid quiz description');
      const questionBody = {
        question: 'how hard iter3 is',
        duration: 20,
        points: 5,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
          {
            answer: 'super hard',
            correct: true
          },
          {
            answer: 'hard',
            correct: false,
          }
        ]
      };
      expect(() => adminQuizQuestionCreate(quiz.quizId, token2.token, questionBody)).toThrow(HTTPError[400]);
    });

    test('Question string is less than 5 characters in length or greater than 50 characters in length', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const questionBody = {
        question: 'how',
        duration: 20,
        points: 5,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
          {
            answer: 'super hard',
            correct: true
          },
          {
            answer: 'hard',
            correct: false,
          }
        ]
      };
      expect(() => adminQuizQuestionCreate(quiz.quizId, token.token, questionBody)).toThrow(HTTPError[400]);
    });

    test('The question has more than 6 answers or less than 2 answers', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const questionBody = {
        question: 'how hard iter3 is',
        duration: 20,
        points: 5,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
        ]
      };
      expect(() => adminQuizQuestionCreate(quiz.quizId, token.token, questionBody)).toThrow(HTTPError[400]);
    });

    test('The question duration is not a positive number', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const questionBody = {
        question: 'how hard iter3 is',
        duration: -10,
        points: 5,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
          {
            answer: 'super hard',
            correct: true
          },
          {
            answer: 'hard',
            correct: false,
          }
        ]
      };
      expect(() => adminQuizQuestionCreate(quiz.quizId, token.token, questionBody)).toThrow(HTTPError[400]);
    });

    test('The sum of the question durations in the quiz exceeds 3 minutes', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const questionBody1 = {
        question: 'how hard iter3 is',
        duration: 100,
        points: 5,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
          {
            answer: 'super hard',
            correct: true
          },
          {
            answer: 'hard',
            correct: false,
          }
        ]
      };
      const questionBody2 = {
        question: 'how easy iter3 is',
        duration: 81,
        points: 5,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
          {
            answer: 'super hard',
            correct: true
          },
          {
            answer: 'hard',
            correct: false,
          }
        ]
      };
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody1);
      expect(() => adminQuizQuestionCreate(quiz.quizId, token.token, questionBody2)).toThrow(HTTPError[400]);
    });

    test('The points awarded for the question are less than 1 or greater than 10', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const questionBody = {
        question: 'how hard iter3 is',
        duration: 20,
        points: 11,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
          {
            answer: 'super hard',
            correct: true
          },
          {
            answer: 'hard',
            correct: false,
          }
        ]
      };
      expect(() => adminQuizQuestionCreate(quiz.quizId, token.token, questionBody)).toThrow(HTTPError[400]);
    });

    test('The length of any answer is shorter than 1 character long, or longer than 30 characters long', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const questionBody = {
        question: 'how hard iter3 is',
        duration: 20,
        points: 5,
        answers: [
          {
            answer: 'the answer is longer than 30 characters the answer is longer than 30 characters the answer is longer than 30 characters',
            correct: false,
          },
          {
            answer: 'super hard',
            correct: true
          },
          {
            answer: 'hard',
            correct: false,
          }
        ]
      };
      expect(() => adminQuizQuestionCreate(quiz.quizId, token.token, questionBody)).toThrow(HTTPError[400]);
    });

    test('Any answer strings are duplicates of one another (within the same question)', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const questionBody = {
        question: 'how hard iter3 is',
        duration: 20,
        points: 5,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
          {
            answer: 'super easy',
            correct: true
          },
          {
            answer: 'hard',
            correct: false,
          }
        ]
      };
      expect(() => adminQuizQuestionCreate(quiz.quizId, token.token, questionBody)).toThrow(HTTPError[400]);
    });

    test('There are no correct answers', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const questionBody = {
        question: 'how hard iter3 is',
        duration: 20,
        points: 5,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
          {
            answer: 'super hard',
            correct: false
          },
          {
            answer: 'hard',
            correct: false,
          }
        ]
      };
      expect(() => adminQuizQuestionCreate(quiz.quizId, token.token, questionBody)).toThrow(HTTPError[400]);
    });
  });
});

// adminQuizQuestionUpdate Testing
describe('adminQuizQuestionUpdate', () => {
  const questionBody = {
    question: 'how hard iter3 is',
    duration: 20,
    points: 5,
    answers: [
      {
        answer: 'super easy',
        correct: false,
      },
      {
        answer: 'super hard',
        correct: true
      },
      {
        answer: 'hard',
        correct: false,
      }
    ]
  };
  describe('success', () => {
    test('successful updating question', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const newquestionBody = {
        question: 'how easy iter3 is',
        duration: 30,
        points: 6,
        answers: [
          {
            answer: 'super hard',
            correct: false,
          },
          {
            answer: 'super easy',
            correct: true
          },
          {
            answer: 'easy',
            correct: false,
          }
        ]
      };
      expect(adminQuizQuestionUpdate(quiz.quizId, question.questionId, token.token, newquestionBody)).toStrictEqual({});
      expect(adminQuizInfo(quiz.quizId, token.token)).toStrictEqual({
        quizId: quiz.quizId,
        name: 'valid quiz name',
        timeCreated: expect.any(Number),
        timeLastEdited: expect.any(Number),
        description: 'valid quiz description',
        numQuestions: expect.any(Number),
        questions: [
          {
            questionId: expect.any(Number),
            question: 'how easy iter3 is',
            duration: 30,
            points: 6,
            answers: [
              {
                answerId: expect.any(Number),
                answer: 'super hard',
                colour: expect.any(String),
                correct: false,
              },
              {
                answerId: expect.any(Number),
                answer: 'super easy',
                colour: expect.any(String),
                correct: true
              },
              {
                answerId: expect.any(Number),
                answer: 'easy',
                colour: expect.any(String),
                correct: false,
              }
            ]
          }
        ],
        duration: expect.any(Number),
      });
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const newquestionBody = {
        question: 'how easy iter3 is',
        duration: 30,
        points: 6,
        answers: [
          {
            answer: 'super hard',
            correct: false,
          },
          {
            answer: 'super easy',
            correct: true
          },
          {
            answer: 'easy',
            correct: false,
          }
        ]
      };
      expect(() => adminQuizQuestionUpdate(quiz.quizId, question.questionId, undefined, newquestionBody)).toThrow(HTTPError[401]);
    });

    test('Provided token is valid structure, but is not for a currently logged in session', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const newquestionBody = {
        question: 'how easy iter3 is',
        duration: 30,
        points: 6,
        answers: [
          {
            answer: 'super hard',
            correct: false,
          },
          {
            answer: 'super easy',
            correct: true
          },
          {
            answer: 'easy',
            correct: false,
          }
        ]
      };
      adminAuthLogout(token.token);
      expect(() => adminQuizQuestionUpdate(quiz.quizId, question.questionId, token.token, newquestionBody)).toThrow(HTTPError[403]);
    });

    test('Quiz ID does not refer to a valid quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const newquestionBody = {
        question: 'how easy iter3 is',
        duration: 30,
        points: 6,
        answers: [
          {
            answer: 'super hard',
            correct: false,
          },
          {
            answer: 'super easy',
            correct: true
          },
          {
            answer: 'easy',
            correct: false,
          }
        ]
      };
      expect(() => adminQuizQuestionUpdate(quiz.quizId + 1, question.questionId, token.token, newquestionBody)).toThrow(HTTPError[400]);
    });

    test('Quiz ID does not refer to a quiz that this user owns', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const newtoken = adminAuthRegister('newvalidEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const newquestionBody = {
        question: 'how easy iter3 is',
        duration: 30,
        points: 6,
        answers: [
          {
            answer: 'super hard',
            correct: false,
          },
          {
            answer: 'super easy',
            correct: true
          },
          {
            answer: 'easy',
            correct: false,
          }
        ]
      };
      expect(() => adminQuizQuestionUpdate(quiz.quizId, question.questionId, newtoken.token, newquestionBody)).toThrow(HTTPError[400]);
    });

    test('Question Id does not refer to a valid question within this quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const newquestionBody = {
        question: 'how easy iter3 is',
        duration: 30,
        points: 6,
        answers: [
          {
            answer: 'super hard',
            correct: false,
          },
          {
            answer: 'super easy',
            correct: true
          },
          {
            answer: 'easy',
            correct: false,
          }
        ]
      };
      expect(() => adminQuizQuestionUpdate(quiz.quizId, question.questionId + 1, token.token, newquestionBody)).toThrow(HTTPError[400]);
    });

    test('Question string is less than 5 characters in length or greater than 50 characters in length', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const newquestionBody = {
        question: 'how',
        duration: 30,
        points: 6,
        answers: [
          {
            answer: 'super hard',
            correct: false,
          },
          {
            answer: 'super easy',
            correct: true
          },
          {
            answer: 'easy',
            correct: false,
          }
        ]
      };
      expect(() => adminQuizQuestionUpdate(quiz.quizId, question.questionId, token.token, newquestionBody)).toThrow(HTTPError[400]);
    });

    test('The question has more than 6 answers or less than 2 answers', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const newquestionBody = {
        question: 'how easy iter3 is',
        duration: 30,
        points: 6,
        answers: [
          {
            answer: 'super hard',
            correct: false,
          },
        ]
      };
      expect(() => adminQuizQuestionUpdate(quiz.quizId, question.questionId, token.token, newquestionBody)).toThrow(HTTPError[400]);
    });

    test('The question duration is not a positive number', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const newquestionBody = {
        question: 'how easy iter3 is',
        duration: -30,
        points: 6,
        answers: [
          {
            answer: 'super hard',
            correct: false,
          },
          {
            answer: 'super easy',
            correct: true
          },
          {
            answer: 'easy',
            correct: false,
          }
        ]
      };
      expect(() => adminQuizQuestionUpdate(quiz.quizId, question.questionId, token.token, newquestionBody)).toThrow(HTTPError[400]);
    });

    test('If this question were to be updated, the sum of the question durations in the quiz exceeds 3 minutes', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const newquestionBody = {
        question: 'how easy iter3 is',
        duration: 181,
        points: 6,
        answers: [
          {
            answer: 'super hard',
            correct: false,
          },
          {
            answer: 'super easy',
            correct: true
          },
          {
            answer: 'easy',
            correct: false,
          }
        ]
      };
      expect(() => adminQuizQuestionUpdate(quiz.quizId, question.questionId, token.token, newquestionBody)).toThrow(HTTPError[400]);
    });

    test('The points awarded for the question are less than 1 or greater than 10', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const newquestionBody = {
        question: 'how easy iter3 is',
        duration: 30,
        points: 11,
        answers: [
          {
            answer: 'super hard',
            correct: false,
          },
          {
            answer: 'super easy',
            correct: true
          },
          {
            answer: 'easy',
            correct: false,
          }
        ]
      };
      expect(() => adminQuizQuestionUpdate(quiz.quizId, question.questionId, token.token, newquestionBody)).toThrow(HTTPError[400]);
    });

    test('The length of any answer is shorter than 1 character long, or longer than 30 characters long', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const newquestionBody = {
        question: 'how easy iter3 is',
        duration: 30,
        points: 6,
        answers: [
          {
            answer: '',
            correct: false,
          },
          {
            answer: 'super easy',
            correct: true
          },
          {
            answer: 'easy',
            correct: false,
          }
        ]
      };
      expect(() => adminQuizQuestionUpdate(quiz.quizId, question.questionId, token.token, newquestionBody)).toThrow(HTTPError[400]);
    });

    test('Any answer strings are duplicates of one another (within the same question)', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const newquestionBody = {
        question: 'how easy iter3 is',
        duration: 30,
        points: 6,
        answers: [
          {
            answer: 'super hard',
            correct: false,
          },
          {
            answer: 'super hard',
            correct: true
          },
          {
            answer: 'easy',
            correct: false,
          }
        ]
      };
      expect(() => adminQuizQuestionUpdate(quiz.quizId, question.questionId, token.token, newquestionBody)).toThrow(HTTPError[400]);
    });

    test('There are no correct answers', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const newquestionBody = {
        question: 'how easy iter3 is',
        duration: 30,
        points: 6,
        answers: [
          {
            answer: 'super hard',
            correct: false,
          },
          {
            answer: 'super easy',
            correct: false
          },
          {
            answer: 'easy',
            correct: false,
          }
        ]
      };
      expect(() => adminQuizQuestionUpdate(quiz.quizId, question.questionId, token.token, newquestionBody)).toThrow(HTTPError[400]);
    });
  });
});

// adminQuizQuestionRemove Testing
describe('adminQuizQuestionRemove', () => {
  const questionBody = {
    question: 'how hard iter3 is',
    duration: 20,
    points: 5,
    answers: [
      {
        answer: 'super easy',
        correct: false,
      },
      {
        answer: 'super hard',
        correct: true
      },
      {
        answer: 'hard',
        correct: false,
      }
    ]
  };
  describe('success', () => {
    test('successful removing a question', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      expect(adminQuizQuestionRemove(quiz.quizId, question.questionId, token.token)).toStrictEqual({});
      expect(adminQuizInfo(quiz.quizId, token.token)).toStrictEqual({
        quizId: quiz.quizId,
        name: 'valid quiz name',
        timeCreated: expect.any(Number),
        timeLastEdited: expect.any(Number),
        description: 'valid quiz description',
        numQuestions: expect.any(Number),
        questions: [],
        duration: expect.any(Number),
      });
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      expect(() => adminQuizQuestionRemove(quiz.quizId, question.questionId, undefined)).toThrow(HTTPError[401]);
    });

    test('Provided token is valid structure, but is not for a currently logged in session', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      adminAuthLogout(token.token);
      expect(() => adminQuizQuestionRemove(quiz.quizId, question.questionId, token.token)).toThrow(HTTPError[403]);
    });

    test('Quiz ID does not refer to a valid quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      expect(() => adminQuizQuestionRemove(quiz.quizId + 1, question.questionId, token.token)).toThrow(HTTPError[400]);
    });

    test('Quiz ID does not refer to a quiz that this user owns', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const newtoken = adminAuthRegister('newvalidEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      expect(() => adminQuizQuestionRemove(quiz.quizId, question.questionId, newtoken.token)).toThrow(HTTPError[400]);
    });

    test('Question Id does not refer to a valid question within this quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      expect(() => adminQuizQuestionRemove(quiz.quizId, question.questionId + 1, token.token)).toThrow(HTTPError[400]);
    });

    test('All sessions for this quiz must be in END state', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      adminQuizSessionStart(quiz.quizId, token.token, 3);
      expect(() => adminQuizQuestionRemove(quiz.quizId, question.questionId, token.token)).toThrow(HTTPError[400]);
    });
  });
});

// adminQuizQuestionMove Testing
describe('adminQuizQuestionMove', () => {
  const questionBody1 = {
    question: 'how hard iter3 is',
    duration: 20,
    points: 5,
    answers: [
      {
        answer: 'super easy',
        correct: false,
      },
      {
        answer: 'super hard',
        correct: true
      },
      {
        answer: 'hard',
        correct: false,
      }
    ]
  };
  const questionBody2 = {
    question: 'how easy iter3 is',
    duration: 30,
    points: 6,
    answers: [
      {
        answer: 'super hard',
        correct: false,
      },
      {
        answer: 'super easy',
        correct: true
      },
      {
        answer: 'hard',
        correct: false,
      }
    ]
  };
  describe('success', () => {
    test('successful moving the question', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const question1 = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody1);
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody2);
      expect(adminQuizQuestionMove(quiz.quizId, question1.questionId, token.token, 1)).toStrictEqual({});
      expect(adminQuizInfo(quiz.quizId, token.token).questions[1].questions).toStrictEqual(question1.question);
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const question1 = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody1);
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody2);
      expect(() => adminQuizQuestionMove(quiz.quizId, question1.questionId, undefined, 1)).toThrow(HTTPError[401]);
    });

    test('Provided token is valid structure, but is not for a currently logged in session', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const question1 = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody1);
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody2);
      adminAuthLogout(token.token);
      expect(() => adminQuizQuestionMove(quiz.quizId, question1.questionId, token.token, 1)).toThrow(HTTPError[403]);
    });

    test('Quiz ID does not refer to a valid quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const question1 = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody1);
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody2);
      expect(() => adminQuizQuestionMove(quiz.quizId + 1, question1.questionId, token.token, 1)).toThrow(HTTPError[400]);
    });

    test('Quiz ID does not refer to a quiz that this user owns', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const newtoken = adminAuthRegister('newvalidEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const question1 = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody1);
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody2);
      expect(() => adminQuizQuestionMove(quiz.quizId, question1.questionId, newtoken.token, 1)).toThrow(HTTPError[400]);
    });

    test('Question Id does not refer to a valid question within this quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const question1 = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody1);
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody2);
      expect(() => adminQuizQuestionMove(quiz.quizId, question1.questionId + 999, token.token, 1)).toThrow(HTTPError[400]);
    });

    test('NewPosition is less than 0, or NewPosition is greater than n-1 where n is the number of questions', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const question1 = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody1);
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody2);
      expect(() => adminQuizQuestionMove(quiz.quizId, question1.questionId, token.token, -1)).toThrow(HTTPError[400]);
    });

    test('NewPosition is the position of the current question', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const question1 = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody1);
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody2);
      expect(() => adminQuizQuestionMove(quiz.quizId, question1.questionId, token.token, 0)).toThrow(HTTPError[400]);
    });
  });
});

// adminQuizQuestionDuplicate Testing
describe('adminQuizQuestionDuplicate', () => {
  const questionBody = {
    question: 'how hard iter3 is',
    duration: 20,
    points: 5,
    answers: [
      {
        answer: 'super easy',
        correct: false,
      },
      {
        answer: 'super hard',
        correct: true
      },
      {
        answer: 'hard',
        correct: false,
      }
    ]
  };
  describe('success', () => {
    test('successful duplicating the quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      expect(adminQuizQuestionDuplicate(quiz.quizId, question.questionId, token.token)).toStrictEqual({ questionId: expect.any(Number) });
      expect(adminQuizInfo(quiz.quizId, token.token)).toStrictEqual({
        quizId: quiz.quizId,
        name: 'valid quiz name',
        timeCreated: expect.any(Number),
        timeLastEdited: expect.any(Number),
        description: 'valid quiz description',
        numQuestions: expect.any(Number),
        questions: [
          {
            questionId: expect.any(Number),
            question: 'how hard iter3 is',
            duration: 20,
            points: 5,
            answers: [
              {
                answerId: expect.any(Number),
                answer: 'super easy',
                colour: expect.any(String),
                correct: false,
              },
              {
                answerId: expect.any(Number),
                answer: 'super hard',
                colour: expect.any(String),
                correct: true
              },
              {
                answerId: expect.any(Number),
                answer: 'hard',
                colour: expect.any(String),
                correct: false,
              }
            ]
          },
          {
            questionId: expect.any(Number),
            question: 'how hard iter3 is',
            duration: 20,
            points: 5,
            answers: [
              {
                answerId: expect.any(Number),
                answer: 'super easy',
                colour: expect.any(String),
                correct: false,
              },
              {
                answerId: expect.any(Number),
                answer: 'super hard',
                colour: expect.any(String),
                correct: true
              },
              {
                answerId: expect.any(Number),
                answer: 'hard',
                colour: expect.any(String),
                correct: false,
              }
            ]
          }
        ],
        duration: expect.any(Number),
      });
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      expect(() => adminQuizQuestionDuplicate(quiz.quizId, question.questionId, undefined)).toThrow(HTTPError[401]);
    });

    test('Provided token is valid structure, but is not for a currently logged in session', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      adminAuthLogout(token.token);
      expect(() => adminQuizQuestionDuplicate(quiz.quizId, question.questionId, token.token)).toThrow(HTTPError[403]);
    });

    test('Quiz ID does not refer to a valid quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      expect(() => adminQuizQuestionDuplicate(quiz.quizId + 1, question.questionId, token.token)).toThrow(HTTPError[400]);
    });

    test('Quiz ID does not refer to a quiz that this user owns', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const newtoken = adminAuthRegister('newvalidEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      expect(() => adminQuizQuestionDuplicate(quiz.quizId, question.questionId, newtoken.token)).toThrow(HTTPError[400]);
    });

    test('Question Id does not refer to a valid question within this quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreate(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      expect(() => adminQuizQuestionDuplicate(quiz.quizId, question.questionId + 1, token.token)).toThrow(HTTPError[400]);
    });
  });
});

// ========================= Iter3 (Modified) Testing=====================

// adminQuizListV2 Testing
describe('adminQuizListV2', () => {
  describe('success', () => {
    test('successful getting quiz list', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      expect(adminQuizListV2(token.token)).toStrictEqual({
        quizzes: [
          {
            quizId: quiz.quizId,
            name: 'valid quiz name',
          },
        ]
      });
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      expect(() => adminQuizListV2(undefined)).toThrow(HTTPError[401]);
    });

    test('Provided token is valid structure, but is not for a currently logged in session', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      adminAuthLogoutV2(token.token);
      expect(() => adminQuizListV2(token.token)).toThrow(HTTPError[403]);
    });
  });
});

// adminQuizCreateV2 Testing
describe('adminQuizCreateV2', () => {
  describe('success', () => {
    test('successful creating quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      expect(quiz).toStrictEqual({ quizId: expect.any(Number) });
      expect(adminQuizInfoV2(quiz.quizId, token.token)).toStrictEqual({
        quizId: quiz.quizId,
        name: 'valid quiz name',
        timeCreated: expect.any(Number),
        timeLastEdited: expect.any(Number),
        description: 'valid quiz description',
        numQuestions: 0,
        questions: [],
        duration: 0,
        thumbnailUrl: '',
      });
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      expect(() => adminQuizCreateV2(undefined, 'valid quiz name', 'valid quiz description')).toThrow(HTTPError[401]);
    });

    test('Provided token is valid structure, but is not for a currently logged in session', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      adminAuthLogoutV2(token.token);
      expect(() => adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description')).toThrow(HTTPError[403]);
    });

    test('Name contains invalid characters. Valid characters are alphanumeric and spaces', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      expect(() => adminQuizCreateV2(token.token, 'invalid quiz name#', 'valid quiz description')).toThrow(HTTPError[400]);
    });

    test('Name is either less than 3 characters long or more than 30 characters long', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      expect(() => adminQuizCreateV2(token.token, 'in', 'valid quiz description')).toThrow(HTTPError[400]);
    });

    test('Name is already used by the current logged in user for another quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description')).toThrow(HTTPError[400]);
    });

    test('Description is more than 100 characters in length (note: empty strings are OK)', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      expect(() => adminQuizCreateV2(token.token, 'valid quiz name', 'description too long aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')).toThrow(HTTPError[400]);
    });
  });
});

// adminQuizRemoveV2 Testing
describe('adminQuizRemoveV2', () => {
  describe('success', () => {
    test('successful removing quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      expect(adminQuizRemoveV2(quiz.quizId, token.token)).toStrictEqual({});
      expect(adminQuizListV2(token.token)).toStrictEqual({
        quizzes: []
      });
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizRemoveV2(quiz.quizId, undefined)).toThrow(HTTPError[401]);
    });

    test('Provided token is valid structure, but is not for a currently logged in session', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminAuthLogoutV2(token.token);
      expect(() => adminQuizRemoveV2(quiz.quizId, token.token)).toThrow(HTTPError[403]);
    });

    test('Quiz ID does not refer to a valid quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizRemoveV2(quiz.quizId + 1, token.token)).toThrow(HTTPError[400]);
    });

    test('Quiz ID does not refer to a quiz that this user owns', () => {
      const token1 = adminAuthRegister('validEmail1@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const token2 = adminAuthRegister('validEmail2@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token1.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizRemoveV2(quiz.quizId, token2.token)).toThrow(HTTPError[400]);
    });

    test('All sessions for this quiz must be in END state', () => {
      const token1 = adminAuthRegister('validEmail1@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      adminAuthRegister('validEmail2@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token1.token, 'valid quiz name', 'valid quiz description');
      const questionBody = {
        question: 'how hard iter3 is',
        duration: 20,
        points: 5,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
          {
            answer: 'super hard',
            correct: true
          },
          {
            answer: 'hard',
            correct: false,
          }
        ],
        thumbnailUrl: 'https://static.wikia.nocookie.net/youtube/images/3/35/Pusheenthecat.jpeg',
      };
      adminQuizQuestionCreateV2(quiz.quizId, token1.token, questionBody);
      adminQuizSessionStart(quiz.quizId, token1.token, 3);
      expect(() => adminQuizRemoveV2(quiz.quizId, token1.token)).toThrow(HTTPError[400]);
    });
  });
});

// adminQuizInfoV2 Testing
describe('adminQuizInfoV2', () => {
  describe('success', () => {
    test('successful getting quiz info', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      expect(adminQuizInfoV2(quiz.quizId, token.token)).toStrictEqual({
        quizId: quiz.quizId,
        name: 'valid quiz name',
        timeCreated: expect.any(Number),
        timeLastEdited: expect.any(Number),
        description: 'valid quiz description',
        numQuestions: 0,
        questions: [],
        duration: 0,
        thumbnailUrl: '',
      });
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizInfoV2(quiz.quizId, undefined)).toThrow(HTTPError[401]);
    });

    test('Provided token is valid structure, but is not for a currently logged in session', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminAuthLogoutV2(token.token);
      expect(() => adminQuizInfoV2(quiz.quizId, token.token)).toThrow(HTTPError[403]);
    });

    test('Quiz ID does not refer to a valid quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizInfoV2(quiz.quizId + 1, token.token)).toThrow(HTTPError[400]);
    });

    test('Quiz ID does not refer to a quiz that this user owns', () => {
      const token1 = adminAuthRegister('validEmail1@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const token2 = adminAuthRegister('validEmail2@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token1.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizInfoV2(quiz.quizId, token2.token)).toThrow(HTTPError[400]);
    });
  });
});

// adminQuizNameUpdateV2 Testing
describe('adminQuizNameUpdateV2', () => {
  describe('success', () => {
    test('success updating quiz name', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const result = adminQuizNameUpdateV2(quiz.quizId, token.token, 'new valid quiz name');
      expect(result).toStrictEqual({});
      expect(adminQuizInfoV2(quiz.quizId, token.token)).toStrictEqual({
        quizId: quiz.quizId,
        name: 'new valid quiz name',
        timeCreated: expect.any(Number),
        timeLastEdited: expect.any(Number),
        description: 'valid quiz description',
        numQuestions: 0,
        questions: [],
        duration: 0,
        thumbnailUrl: '',
      });
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizNameUpdateV2(quiz.quizId, undefined, 'new valid quiz name')).toThrow(HTTPError[401]);
    });

    test('Provided token is valid structure, but is not for a currently logged in session', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminAuthLogoutV2(token.token);
      expect(() => adminQuizNameUpdateV2(quiz.quizId, token.token, 'new valid quiz name')).toThrow(HTTPError[403]);
    });

    test('Quiz ID does not refer to a valid quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizNameUpdateV2(quiz.quizId + 1, token.token, 'new valid quiz name')).toThrow(HTTPError[400]);
    });

    test('Quiz ID does not refer to a quiz that this user owns', () => {
      const token1 = adminAuthRegister('validEmail1@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const token2 = adminAuthRegister('validEmail2@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token1.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizNameUpdateV2(quiz.quizId, token2.token, 'new valid quiz name')).toThrow(HTTPError[400]);
    });

    test('Name contains invalid characters. Valid characters are alphanumeric and spaces', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizNameUpdateV2(quiz.quizId, token.token, 'invalid quiz name#')).toThrow(HTTPError[400]);
    });

    test('Name is either less than 3 characters long or more than 30 characters long', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizNameUpdateV2(quiz.quizId, token.token, 'in')).toThrow(HTTPError[400]);
    });

    test('Name is already used by the current logged in user for another quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name 1', 'valid quiz description');
      adminQuizCreateV2(token.token, 'valid quiz name 2', 'valid quiz description');
      expect(() => adminQuizNameUpdateV2(quiz.quizId, token.token, 'valid quiz name 2')).toThrow(HTTPError[400]);
    });
  });
});

// adminQuizDescriptionUpdateV2 Testing
describe('adminQuizDescriptionUpdateV2', () => {
  describe('success', () => {
    test('successful quiz description update', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const result = adminQuizDescriptionUpdateV2(quiz.quizId, token.token, 'new valid quiz description');
      expect(result).toStrictEqual({});
      expect(adminQuizInfoV2(quiz.quizId, token.token)).toStrictEqual({
        quizId: quiz.quizId,
        name: 'valid quiz name',
        timeCreated: expect.any(Number),
        timeLastEdited: expect.any(Number),
        description: 'new valid quiz description',
        numQuestions: 0,
        questions: [],
        duration: 0,
        thumbnailUrl: '',
      });
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizDescriptionUpdateV2(quiz.quizId, undefined, 'new valid quiz description')).toThrow(HTTPError[401]);
    });

    test('Provided token is valid structure, but is not for a currently logged in session', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminAuthLogoutV2(token.token);
      expect(() => adminQuizDescriptionUpdate(quiz.quizId, token.token, 'new valid quiz description')).toThrow(HTTPError[403]);
    });

    test('Quiz ID does not refer to a valid quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizDescriptionUpdateV2(quiz.quizId + 1, token.token, 'new valid quiz description')).toThrow(HTTPError[400]);
    });

    test('Quiz ID does not refer to a quiz that this user owns', () => {
      const token1 = adminAuthRegister('validEmail1@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const token2 = adminAuthRegister('validEmail2@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token1.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizDescriptionUpdateV2(quiz.quizId, token2.token, 'new valid quiz description')).toThrow(HTTPError[400]);
    });

    test('Description is more than 100 characters in length (note: empty strings are OK)', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizDescriptionUpdateV2(quiz.quizId, token.token, 'invalid quiz description aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')).toThrow(HTTPError[400]);
    });
  });
});

// adminQuizTrashViewV2 Testing
describe('adminQuizTrashViewV2', () => {
  describe('success', () => {
    test('successful view quizTrash', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizRemoveV2(quiz.quizId, token.token);
      expect(adminQuizTrashViewV2(token.token)).toStrictEqual({
        quizzes: [
          {
            quizId: quiz.quizId,
            name: 'valid quiz name',
          }
        ]
      });
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizRemoveV2(quiz.quizId, token.token);
      expect(() => adminQuizTrashViewV2(undefined)).toThrow(HTTPError[401]);
    });

    test('Provided token is valid structure, but is not for a currently logged in session', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizRemoveV2(quiz.quizId, token.token);
      adminAuthLogoutV2(token.token);
      expect(() => adminQuizTrashViewV2(token.token)).toThrow(HTTPError[403]);
    });
  });
});

// adminQuizRestoreV2 Testing
describe('adminQuizRestoreV2', () => {
  describe('success', () => {
    test('successful restoring a quiz from trash', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizRemoveV2(quiz.quizId, token.token);
      const result = adminQuizRestoreV2(quiz.quizId, token.token);
      expect(result).toStrictEqual({});
      expect(adminQuizListV2(token.token)).toStrictEqual({
        quizzes: [
          {
            quizId: quiz.quizId,
            name: 'valid quiz name',
          },
        ]
      });
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizRemoveV2(quiz.quizId, token.token);
      expect(() => adminQuizRestoreV2(quiz.quizId, undefined)).toThrow(HTTPError[401]);
    });

    test('Provided token is valid structure, but is not for a currently logged in session', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizRemoveV2(quiz.quizId, token.token);
      adminAuthLogoutV2(token.token);
      expect(() => adminQuizRestoreV2(quiz.quizId, token.token)).toThrow(HTTPError[403]);
    });

    test('Quiz ID does not refer to a valid quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizRemoveV2(quiz.quizId, token.token);
      expect(() => adminQuizRestoreV2(quiz.quizId + 1, token.token)).toThrow(HTTPError[400]);
    });

    test('Quiz ID does not refer to a quiz that this user owns', () => {
      const token1 = adminAuthRegister('validEmail1@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const token2 = adminAuthRegister('validEmail2@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token1.token, 'valid quiz name', 'valid quiz description');
      adminQuizRemoveV2(quiz.quizId, token1.token);
      expect(() => adminQuizRestoreV2(quiz.quizId, token2.token)).toThrow(HTTPError[400]);
    });

    test('Quiz ID refers to a quiz that is not currently in the trash', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizRestoreV2(quiz.quizId, token.token)).toThrow(HTTPError[400]);
    });
  });
});

// adminQuizTrashEmptyV2 Testing
describe('adminQuizTrashEmptyV2', () => {
  describe('success', () => {
    test('successful deleting quizzes currently in trash', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz1 = adminQuizCreateV2(token.token, 'valid quiz name 1', 'valid quiz description');
      const quiz2 = adminQuizCreateV2(token.token, 'valid quiz name 2', 'valid quiz description');
      const quiz3 = adminQuizCreateV2(token.token, 'valid quiz name 3', 'valid quiz description');
      adminQuizRemoveV2(quiz1.quizId, token.token);
      adminQuizRemoveV2(quiz2.quizId, token.token);
      adminQuizRemoveV2(quiz3.quizId, token.token);
      expect(adminQuizTrashEmptyV2(token.token, [quiz1.quizId, quiz2.quizId, quiz3.quizId])).toStrictEqual({});
      expect(adminQuizTrashViewV2(token.token)).toStrictEqual({
        quizzes: []
      });
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name 1', 'valid quiz description');
      adminQuizRemoveV2(quiz.quizId, token.token);
      expect(() => adminQuizTrashEmptyV2(undefined, quiz.quizId)).toThrow(HTTPError[401]);
    });

    test('Provided token is valid structure, but is not for a currently logged in session', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name 1', 'valid quiz description');
      adminQuizRemoveV2(quiz.quizId, token.token);
      adminAuthLogoutV2(token.token);
      expect(() => adminQuizTrashEmptyV2(token.token, quiz.quizId)).toThrow(HTTPError[403]);
    });

    test('One or more of the Quiz IDs is not a valid quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name 1', 'valid quiz description');
      adminQuizRemoveV2(quiz.quizId, token.token);
      expect(() => adminQuizTrashEmptyV2(token.token, quiz.quizId + 1)).toThrow(HTTPError[400]);
    });

    test('One or more of the Quiz IDs refers to a quiz that this current user does not own', () => {
      const token1 = adminAuthRegister('validEmail1@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const token2 = adminAuthRegister('validEmail2@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token1.token, 'valid quiz name 1', 'valid quiz description');
      adminQuizRemoveV2(quiz.quizId, token1.token);
      expect(() => adminQuizTrashEmptyV2(token2.token, quiz.quizId)).toThrow(HTTPError[400]);
    });

    test('One or more of the Quiz IDs is not currently in the trash', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name 1', 'valid quiz description');
      expect(() => adminQuizTrashEmptyV2(token.token, quiz.quizId)).toThrow(HTTPError[400]);
    });
  });
});

// adminQuizTransferV2 Testing
describe('adminQuizTransferV2', () => {
  describe('success', () => {
    test('successful transfering quiz', () => {
      const token1 = adminAuthRegister('validEmail1@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const token2 = adminAuthRegister('validEmail2@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token1.token, 'valid quiz name', 'valid quiz description');
      expect(adminQuizTransferV2(quiz.quizId, token1.token, 'validEmail2@unsw.edu.au')).toStrictEqual({});
      expect(adminQuizListV2(token2.token)).toStrictEqual({
        quizzes: [
          {
            quizId: quiz.quizId,
            name: 'valid quiz name'
          },
        ]
      });
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      const token = adminAuthRegister('validEmail1@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      adminAuthRegister('validEmail2@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizTransferV2(quiz.quizId, undefined, 'validEmail2@unsw.edu.au')).toThrow(HTTPError[401]);
    });

    test('Provided token is valid structure, but is not for a currently logged in session', () => {
      const token = adminAuthRegister('validEmail1@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      adminAuthRegister('validEmail2@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminAuthLogoutV2(token.token);
      expect(() => adminQuizTransferV2(quiz.quizId, token.token, 'validEmail2@unsw.edu.au')).toThrow(HTTPError[403]);
    });

    test('Quiz ID does not refer to a valid quiz', () => {
      const token = adminAuthRegister('validEmail1@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      adminAuthRegister('validEmail2@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizTransferV2(quiz.quizId + 1, token.token, 'validEmail2@unsw.edu.au')).toThrow(HTTPError[400]);
    });

    test('Quiz ID does not refer to a quiz that this user owns', () => {
      const token1 = adminAuthRegister('validEmail1@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const token2 = adminAuthRegister('validEmail2@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token1.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizTransferV2(quiz.quizId, token2.token, 'validEmail2@unsw.edu.au')).toThrow(HTTPError[400]);
    });

    test('userEmail is not a real user', () => {
      const token = adminAuthRegister('validEmail1@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      adminAuthRegister('validEmail2@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizTransferV2(quiz.quizId, token.token, 'invalidEmail@unsw.edu.au')).toThrow(HTTPError[400]);
    });

    test('userEmail is the current logged in user', () => {
      const token = adminAuthRegister('validEmail1@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      adminAuthRegister('validEmail2@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizTransferV2(quiz.quizId, token.token, 'validEmail1@unsw.edu.au')).toThrow(HTTPError[400]);
    });

    test('Quiz ID refers to a quiz that has a name that is already used by the target user', () => {
      const token1 = adminAuthRegister('validEmail1@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const token2 = adminAuthRegister('validEmail2@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz1 = adminQuizCreateV2(token1.token, 'valid quiz name', 'valid quiz description');
      adminQuizCreateV2(token2.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizTransferV2(quiz1.quizId, token1.token, 'validEmail2@unsw.edu.au')).toThrow(HTTPError[400]);
    });

    test('All sessions for this quiz must be in END state', () => {
      const token1 = adminAuthRegister('validEmail1@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      adminAuthRegister('validEmail2@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token1.token, 'valid quiz name', 'valid quiz description');
      const questionBody = {
        question: 'how hard iter3 is',
        duration: 20,
        points: 5,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
          {
            answer: 'super hard',
            correct: true
          },
          {
            answer: 'hard',
            correct: false,
          }
        ],
      };
      adminQuizQuestionCreate(quiz.quizId, token1.token, questionBody);
      adminQuizSessionStart(quiz.quizId, token1.token, 3);
      expect(() => adminQuizTransferV2(quiz.quizId, token1.token, 'validEmail2@unsw.edu.au')).toThrow(HTTPError[400]);
    });
  });
});

// adminQuizQuestionCreateV2 Testing
describe('adminQuizQuestionCreateV2', () => {
  describe('success', () => {
    test('successful creating a question', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const questionBody = {
        question: 'how hard iter3 is',
        duration: 20,
        points: 5,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
          {
            answer: 'super hard',
            correct: true
          },
          {
            answer: 'hard',
            correct: false,
          }
        ],
        thumbnailUrl: 'https://cdn.icon-icons.com/icons2/2596/PNG/512/check_small_icon_155663.png',
      };
      expect(adminQuizQuestionCreateV2(quiz.quizId, token.token, questionBody)).toStrictEqual({ questionId: expect.any(Number) });
      expect(adminQuizInfoV2(quiz.quizId, token.token)).toStrictEqual({
        quizId: quiz.quizId,
        name: 'valid quiz name',
        timeCreated: expect.any(Number),
        timeLastEdited: expect.any(Number),
        description: 'valid quiz description',
        numQuestions: expect.any(Number),
        questions: [
          {
            questionId: expect.any(Number),
            question: 'how hard iter3 is',
            duration: 20,
            points: 5,
            answers: [
              {
                answerId: expect.any(Number),
                answer: 'super easy',
                colour: expect.any(String),
                correct: false,
              },
              {
                answerId: expect.any(Number),
                answer: 'super hard',
                colour: expect.any(String),
                correct: true
              },
              {
                answerId: expect.any(Number),
                answer: 'hard',
                colour: expect.any(String),
                correct: false,
              }
            ],
            thumbnailUrl: expect.any(String),
          }
        ],
        duration: expect.any(Number),
        thumbnailUrl: '',
      });
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const questionBody = {
        question: 'how hard iter3 is',
        duration: 20,
        points: 5,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
          {
            answer: 'super hard',
            correct: true
          },
          {
            answer: 'hard',
            correct: false,
          }
        ],
        thumbnailUrl: 'https://cdn.icon-icons.com/icons2/2596/PNG/512/check_small_icon_155663.png',
      };
      expect(() => adminQuizQuestionCreateV2(quiz.quizId, undefined, questionBody)).toThrow(HTTPError[401]);
    });

    test('Provided token is valid structure, but is not for a currently logged in session', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const questionBody = {
        question: 'how hard iter3 is',
        duration: 20,
        points: 5,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
          {
            answer: 'super hard',
            correct: true
          },
          {
            answer: 'hard',
            correct: false,
          }
        ],
        thumbnailUrl: 'https://cdn.icon-icons.com/icons2/2596/PNG/512/check_small_icon_155663.png',
      };
      adminAuthLogoutV2(token.token);
      expect(() => adminQuizQuestionCreateV2(quiz.quizId, token.token, questionBody)).toThrow(HTTPError[403]);
    });

    test('Quiz ID does not refer to a valid quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const questionBody = {
        question: 'how hard iter3 is',
        duration: 20,
        points: 5,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
          {
            answer: 'super hard',
            correct: true
          },
          {
            answer: 'hard',
            correct: false,
          }
        ],
        thumbnailUrl: 'https://cdn.icon-icons.com/icons2/2596/PNG/512/check_small_icon_155663.png',
      };
      expect(() => adminQuizQuestionCreateV2(quiz.quizId + 1, token.token, questionBody)).toThrow(HTTPError[400]);
    });

    test('Quiz ID does not refer to a quiz that this user owns', () => {
      const token1 = adminAuthRegister('validEmail1@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const token2 = adminAuthRegister('validEmail2@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token1.token, 'valid quiz name', 'valid quiz description');
      const questionBody = {
        question: 'how hard iter3 is',
        duration: 20,
        points: 5,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
          {
            answer: 'super hard',
            correct: true
          },
          {
            answer: 'hard',
            correct: false,
          }
        ],
        thumbnailUrl: 'https://cdn.icon-icons.com/icons2/2596/PNG/512/check_small_icon_155663.png',
      };
      expect(() => adminQuizQuestionCreateV2(quiz.quizId, token2.token, questionBody)).toThrow(HTTPError[400]);
    });

    test('Question string is less than 5 characters in length or greater than 50 characters in length', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const questionBody = {
        question: 'how',
        duration: 20,
        points: 5,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
          {
            answer: 'super hard',
            correct: true
          },
          {
            answer: 'hard',
            correct: false,
          }
        ],
        thumbnailUrl: 'https://cdn.icon-icons.com/icons2/2596/PNG/512/check_small_icon_155663.png',
      };
      expect(() => adminQuizQuestionCreateV2(quiz.quizId, token.token, questionBody)).toThrow(HTTPError[400]);
    });

    test('The question has more than 6 answers or less than 2 answers', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const questionBody = {
        question: 'how hard iter3 is',
        duration: 20,
        points: 5,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
        ],
        thumbnailUrl: 'https://cdn.icon-icons.com/icons2/2596/PNG/512/check_small_icon_155663.png',
      };
      expect(() => adminQuizQuestionCreateV2(quiz.quizId, token.token, questionBody)).toThrow(HTTPError[400]);
    });

    test('The question duration is not a positive number', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const questionBody = {
        question: 'how hard iter3 is',
        duration: -10,
        points: 5,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
          {
            answer: 'super hard',
            correct: true
          },
          {
            answer: 'hard',
            correct: false,
          }
        ],
        thumbnailUrl: 'https://cdn.icon-icons.com/icons2/2596/PNG/512/check_small_icon_155663.png',
      };
      expect(() => adminQuizQuestionCreateV2(quiz.quizId, token.token, questionBody)).toThrow(HTTPError[400]);
    });

    test('The sum of the question durations in the quiz exceeds 3 minutes', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const questionBody1 = {
        question: 'how hard iter3 is',
        duration: 100,
        points: 5,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
          {
            answer: 'super hard',
            correct: true
          },
          {
            answer: 'hard',
            correct: false,
          }
        ],
        thumbnailUrl: 'https://cdn.icon-icons.com/icons2/2596/PNG/512/check_small_icon_155663.png',
      };
      const questionBody2 = {
        question: 'how easy iter3 is',
        duration: 81,
        points: 5,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
          {
            answer: 'super hard',
            correct: true
          },
          {
            answer: 'hard',
            correct: false,
          }
        ],
        thumbnailUrl: 'https://cdn.icon-icons.com/icons2/2596/PNG/512/check_small_icon_155663.png',
      };
      adminQuizQuestionCreateV2(quiz.quizId, token.token, questionBody1);
      expect(() => adminQuizQuestionCreateV2(quiz.quizId, token.token, questionBody2)).toThrow(HTTPError[400]);
    });

    test('The points awarded for the question are less than 1 or greater than 10', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const questionBody = {
        question: 'how hard iter3 is',
        duration: 20,
        points: 11,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
          {
            answer: 'super hard',
            correct: true
          },
          {
            answer: 'hard',
            correct: false,
          }
        ],
        thumbnailUrl: 'https://cdn.icon-icons.com/icons2/2596/PNG/512/check_small_icon_155663.png',
      };
      expect(() => adminQuizQuestionCreateV2(quiz.quizId, token.token, questionBody)).toThrow(HTTPError[400]);
    });

    test('The length of any answer is shorter than 1 character long, or longer than 30 characters long', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const questionBody = {
        question: 'how hard iter3 is',
        duration: 20,
        points: 5,
        answers: [
          {
            answer: 'the answer is longer than 30 characters the answer is longer than 30 characters the answer is longer than 30 characters',
            correct: false,
          },
          {
            answer: 'super hard',
            correct: true
          },
          {
            answer: 'hard',
            correct: false,
          }
        ],
        thumbnailUrl: 'https://cdn.icon-icons.com/icons2/2596/PNG/512/check_small_icon_155663.png',
      };
      expect(() => adminQuizQuestionCreateV2(quiz.quizId, token.token, questionBody)).toThrow(HTTPError[400]);
    });

    test('Any answer strings are duplicates of one another (within the same question)', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const questionBody = {
        question: 'how hard iter3 is',
        duration: 20,
        points: 5,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
          {
            answer: 'super easy',
            correct: true
          },
          {
            answer: 'hard',
            correct: false,
          }
        ],
        thumbnailUrl: 'https://cdn.icon-icons.com/icons2/2596/PNG/512/check_small_icon_155663.png',
      };
      expect(() => adminQuizQuestionCreateV2(quiz.quizId, token.token, questionBody)).toThrow(HTTPError[400]);
    });

    test('There are no correct answers', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const questionBody = {
        question: 'how hard iter3 is',
        duration: 20,
        points: 5,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
          {
            answer: 'super hard',
            correct: false
          },
          {
            answer: 'hard',
            correct: false,
          }
        ],
        thumbnailUrl: 'https://cdn.icon-icons.com/icons2/2596/PNG/512/check_small_icon_155663.png',
      };
      expect(() => adminQuizQuestionCreateV2(quiz.quizId, token.token, questionBody)).toThrow(HTTPError[400]);
    });

    test('The thumbnailUrl is an empty string', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const questionBody = {
        question: 'how hard iter3 is',
        duration: 20,
        points: 5,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
          {
            answer: 'super hard',
            correct: true
          },
          {
            answer: 'hard',
            correct: false,
          }
        ],
        thumbnailUrl: '',
      };
      expect(() => adminQuizQuestionCreateV2(quiz.quizId, token.token, questionBody)).toThrow(HTTPError[400]);
    });

    test('The thumbnailUrl, when fetched, is not a JPG or PNg file type', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const questionBody = {
        question: 'how hard iter3 is',
        duration: 20,
        points: 5,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
          {
            answer: 'super hard',
            correct: true
          },
          {
            answer: 'hard',
            correct: false,
          }
        ],
        thumbnailUrl: 'https://user-images.githubusercontent.com/14011726/94132137-7d4fc100-fe7c-11ea-8512-69f90cb65e48.gif',
      };
      expect(() => adminQuizQuestionCreateV2(quiz.quizId, token.token, questionBody)).toThrow(HTTPError[400]);
    });

    test('The thumbnailUrl does not return to a valid file', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const questionBody = {
        question: 'how hard iter3 is',
        duration: 20,
        points: 5,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
          {
            answer: 'super hard',
            correct: true
          },
          {
            answer: 'hard',
            correct: false,
          }
        ],
        thumbnailUrl: 'https://expressjs.com/en/starter/static-f.png',
      };
      expect(() => adminQuizQuestionCreateV2(quiz.quizId, token.token, questionBody)).toThrow(HTTPError[400]);
    });
  });
});

// adminQuizQuestionUpdateV2 Testing
describe('adminQuizQuestionUpdateV2', () => {
  const questionBody = {
    question: 'how hard iter3 is',
    duration: 20,
    points: 5,
    answers: [
      {
        answer: 'super easy',
        correct: false,
      },
      {
        answer: 'super hard',
        correct: true
      },
      {
        answer: 'hard',
        correct: false,
      }
    ],
    thumbnailUrl: 'https://static.wikia.nocookie.net/youtube/images/3/35/Pusheenthecat.jpeg',
  };
  describe('success', () => {
    test('successful updating question info', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreateV2(quiz.quizId, token.token, questionBody);
      const newQuestionBody = {
        question: 'how easy iter3 is',
        duration: 21,
        points: 4,
        answers: [
          {
            answer: 'super hard',
            correct: true,
          },
          {
            answer: 'super easy',
            correct: false
          },
          {
            answer: 'hard',
            correct: false,
          }
        ],
        thumbnailUrl: 'https://cdn.icon-icons.com/icons2/2596/PNG/512/check_small_icon_155663.png',
      };
      expect(adminQuizQuestionUpdateV2(quiz.quizId, question.questionId, token.token, newQuestionBody)).toStrictEqual({});
      expect(adminQuizInfoV2(quiz.quizId, token.token)).toStrictEqual({
        quizId: quiz.quizId,
        name: 'valid quiz name',
        timeCreated: expect.any(Number),
        timeLastEdited: expect.any(Number),
        description: 'valid quiz description',
        numQuestions: expect.any(Number),
        questions: [
          {
            questionId: expect.any(Number),
            question: 'how easy iter3 is',
            duration: 21,
            points: 4,
            answers: [
              {
                answerId: expect.any(Number),
                answer: 'super hard',
                colour: expect.any(String),
                correct: true,
              },
              {
                answerId: expect.any(Number),
                answer: 'super easy',
                colour: expect.any(String),
                correct: false
              },
              {
                answerId: expect.any(Number),
                answer: 'hard',
                colour: expect.any(String),
                correct: false,
              }
            ],
            thumbnailUrl: expect.any(String),
          }
        ],
        duration: expect.any(Number),
        thumbnailUrl: '',
      });
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreateV2(quiz.quizId, token.token, questionBody);
      expect(() => adminQuizQuestionUpdateV2(quiz.quizId, question.questionId, undefined, questionBody)).toThrow(HTTPError[401]);
    });

    test('Provided token is valid structure, but is not for a currently logged in session', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreateV2(quiz.quizId, token.token, questionBody);
      adminAuthLogoutV2(token.token);
      expect(() => adminQuizQuestionUpdateV2(quiz.quizId, question.questionId, token.token, questionBody)).toThrow(HTTPError[403]);
    });

    test('Quiz ID does not refer to a valid quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreateV2(quiz.quizId, token.token, questionBody);
      expect(() => adminQuizQuestionUpdateV2(quiz.quizId + 1, question.questionId, token.token, questionBody)).toThrow(HTTPError[400]);
    });

    test('Quiz ID does not refer to a quiz that this user owns', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const newtoken = adminAuthRegister('newvalidEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreateV2(quiz.quizId, token.token, questionBody);
      expect(() => adminQuizQuestionUpdateV2(quiz.quizId, question.questionId, newtoken.token, questionBody)).toThrow(HTTPError[400]);
    });

    test('Question Id does not refer to a valid question within this quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreateV2(quiz.quizId, token.token, questionBody);
      expect(() => adminQuizQuestionUpdateV2(quiz.quizId, question.questionId + 1, token.token, questionBody)).toThrow(HTTPError[400]);
    });

    test('Question string is less than 5 characters in length or greater than 50 characters in length', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreateV2(quiz.quizId, token.token, questionBody);
      const wrongQuestionBody = {
        question: 'QuestionStringIsTooLongQuestionStringIsTooLongQuestionStringIsTooLongQuestionStringIsTooLongQuestionStringIsTooLong',
        duration: 20,
        points: 5,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
          {
            answer: 'super hard',
            correct: true
          },
          {
            answer: 'hard',
            correct: false,
          }
        ],
        thumbnailUrl: 'https://static.wikia.nocookie.net/youtube/images/3/35/Pusheenthecat.jpeg',
      };
      expect(() => adminQuizQuestionUpdateV2(quiz.quizId, question.questionId, token.token, wrongQuestionBody)).toThrow(HTTPError[400]);
    });

    test('The question has more than 6 answers or less than 2 answers', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreateV2(quiz.quizId, token.token, questionBody);
      const wrongQuestionBody = {
        question: 'ingIsTooLong',
        duration: 20,
        points: 5,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
        ],
        thumbnailUrl: 'https://static.wikia.nocookie.net/youtube/images/3/35/Pusheenthecat.jpeg',
      };
      expect(() => adminQuizQuestionUpdateV2(quiz.quizId, question.questionId, token.token, wrongQuestionBody)).toThrow(HTTPError[400]);
    });

    test('The question duration is not a positive number', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreateV2(quiz.quizId, token.token, questionBody);
      const wrongQuestionBody = {
        question: 'sTooLong',
        duration: -20,
        points: 5,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
          {
            answer: 'super hard',
            correct: true
          },
          {
            answer: 'hard',
            correct: false,
          }
        ],
        thumbnailUrl: 'https://static.wikia.nocookie.net/youtube/images/3/35/Pusheenthecat.jpeg',
      };
      expect(() => adminQuizQuestionUpdateV2(quiz.quizId, question.questionId, token.token, wrongQuestionBody)).toThrow(HTTPError[400]);
    });

    test('If this question were to be updated, the sum of the question durations in the quiz exceeds 3 minutes', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreateV2(quiz.quizId, token.token, questionBody);
      const wrongQuestionBody = {
        question: 'sTooLong',
        duration: 161,
        points: 5,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
          {
            answer: 'super hard',
            correct: true
          },
          {
            answer: 'hard',
            correct: false,
          }
        ],
        thumbnailUrl: 'https://static.wikia.nocookie.net/youtube/images/3/35/Pusheenthecat.jpeg',
      };
      expect(() => adminQuizQuestionUpdateV2(quiz.quizId, question.questionId, token.token, wrongQuestionBody)).toThrow(HTTPError[400]);
    });

    test('The points awarded for the question are less than 1 or greater than 10', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreateV2(quiz.quizId, token.token, questionBody);
      const wrongQuestionBody = {
        question: 'sTooLong',
        duration: 20,
        points: 11,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
          {
            answer: 'super hard',
            correct: true
          },
          {
            answer: 'hard',
            correct: false,
          }
        ],
        thumbnailUrl: 'https://static.wikia.nocookie.net/youtube/images/3/35/Pusheenthecat.jpeg',
      };
      expect(() => adminQuizQuestionUpdateV2(quiz.quizId, question.questionId, token.token, wrongQuestionBody)).toThrow(HTTPError[400]);
    });

    test('The length of any answer is shorter than 1 character long, or longer than 30 characters long', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreateV2(quiz.quizId, token.token, questionBody);
      const wrongQuestionBody = {
        question: 'sTooLong',
        duration: 20,
        points: 5,
        answers: [
          {
            answer: '',
            correct: false,
          },
          {
            answer: 'super hard',
            correct: true
          },
          {
            answer: 'hard',
            correct: false,
          }
        ],
        thumbnailUrl: 'https://static.wikia.nocookie.net/youtube/images/3/35/Pusheenthecat.jpeg',
      };
      expect(() => adminQuizQuestionUpdateV2(quiz.quizId, question.questionId, token.token, wrongQuestionBody)).toThrow(HTTPError[400]);
    });

    test('Any answer strings are duplicates of one another (within the same question)', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreateV2(quiz.quizId, token.token, questionBody);
      const wrongQuestionBody = {
        question: 'sTooLong',
        duration: 20,
        points: 5,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
          {
            answer: 'super easy',
            correct: true
          },
          {
            answer: 'hard',
            correct: false,
          }
        ],
        thumbnailUrl: 'https://static.wikia.nocookie.net/youtube/images/3/35/Pusheenthecat.jpeg',
      };
      expect(() => adminQuizQuestionUpdateV2(quiz.quizId, question.questionId, token.token, wrongQuestionBody)).toThrow(HTTPError[400]);
    });

    test('There are no correct answers', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreateV2(quiz.quizId, token.token, questionBody);
      const wrongQuestionBody = {
        question: 'sTooLong',
        duration: 20,
        points: 5,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
          {
            answer: 'super hard',
            correct: false
          },
          {
            answer: 'hard',
            correct: false,
          }
        ],
        thumbnailUrl: 'https://static.wikia.nocookie.net/youtube/images/3/35/Pusheenthecat.jpeg',
      };
      expect(() => adminQuizQuestionUpdateV2(quiz.quizId, question.questionId, token.token, wrongQuestionBody)).toThrow(HTTPError[400]);
    });

    test('The thumbnailUrl is an empty string', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreateV2(quiz.quizId, token.token, questionBody);
      const wrongQuestionBody = {
        question: 'sTooLong',
        duration: 20,
        points: 5,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
          {
            answer: 'super hard',
            correct: true
          },
          {
            answer: 'hard',
            correct: false,
          }
        ],
        thumbnailUrl: '',
      };
      expect(() => adminQuizQuestionUpdateV2(quiz.quizId, question.questionId, token.token, wrongQuestionBody)).toThrow(HTTPError[400]);
    });

    test('The thumbnailUrl does not return to a valid file', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreateV2(quiz.quizId, token.token, questionBody);
      const wrongQuestionBody = {
        question: 'sTooLong',
        duration: 20,
        points: 11,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
          {
            answer: 'super hard',
            correct: true
          },
          {
            answer: 'hard',
            correct: false,
          }
        ],
        thumbnailUrl: 'https://expressjs.com/en/starter/static-f.png',
      };
      expect(() => adminQuizQuestionUpdateV2(quiz.quizId, question.questionId, token.token, wrongQuestionBody)).toThrow(HTTPError[400]);
    });

    test('The thumbnailUrl, when fetched, is not a JPG or PNg file type', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreateV2(quiz.quizId, token.token, questionBody);
      const wrongQuestionBody = {
        question: 'sTooLong',
        duration: 20,
        points: 5,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
          {
            answer: 'super hard',
            correct: true
          },
          {
            answer: 'hard',
            correct: false,
          }
        ],
        thumbnailUrl: 'https://user-images.githubusercontent.com/14011726/94132137-7d4fc100-fe7c-11ea-8512-69f90cb65e48.gif',
      };
      expect(() => adminQuizQuestionUpdateV2(quiz.quizId, question.questionId, token.token, wrongQuestionBody)).toThrow(HTTPError[400]);
    });
  });
});

// adminQuizQuestionRemoveV2 Testing
describe('adminQuizQuestionRemoveV2', () => {
  const questionBody = {
    question: 'how hard iter3 is',
    duration: 20,
    points: 5,
    answers: [
      {
        answer: 'super easy',
        correct: false,
      },
      {
        answer: 'super hard',
        correct: true
      },
      {
        answer: 'hard',
        correct: false,
      }
    ],
  };
  describe('success', () => {
    test('successful removing a question', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      expect(adminQuizQuestionRemoveV2(quiz.quizId, question.questionId, token.token)).toStrictEqual({});
      expect(adminQuizInfoV2(quiz.quizId, token.token)).toStrictEqual({
        quizId: quiz.quizId,
        name: 'valid quiz name',
        timeCreated: expect.any(Number),
        timeLastEdited: expect.any(Number),
        description: 'valid quiz description',
        numQuestions: expect.any(Number),
        questions: [],
        duration: expect.any(Number),
        thumbnailUrl: expect.any(String),
      });
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      expect(() => adminQuizQuestionRemoveV2(quiz.quizId, question.questionId, undefined)).toThrow(HTTPError[401]);
    });

    test('Provided token is valid structure, but is not for a currently logged in session', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      adminAuthLogoutV2(token.token);
      expect(() => adminQuizQuestionRemoveV2(quiz.quizId, question.questionId, token.token)).toThrow(HTTPError[403]);
    });

    test('Quiz ID does not refer to a valid quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      expect(() => adminQuizQuestionRemoveV2(quiz.quizId + 1, question.questionId, token.token)).toThrow(HTTPError[400]);
    });

    test('Quiz ID does not refer to a quiz that this user owns', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const newtoken = adminAuthRegister('newvalidEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      expect(() => adminQuizQuestionRemoveV2(quiz.quizId, question.questionId, newtoken.token)).toThrow(HTTPError[400]);
    });

    test('Question Id does not refer to a valid question within this quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      expect(() => adminQuizQuestionRemoveV2(quiz.quizId, question.questionId + 1, token.token)).toThrow(HTTPError[400]);
    });

    test('All sessions for this quiz must be in END state', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      adminQuizSessionStart(quiz.quizId, token.token, 3);
      expect(() => adminQuizQuestionRemoveV2(quiz.quizId, question.questionId, token.token)).toThrow(HTTPError[400]);
    });
  });
});

// adminQuizQuestionMoveV2 Testing
describe('adminQuizQuestionMoveV2', () => {
  const questionBody1 = {
    question: 'how hard iter3 is',
    duration: 20,
    points: 5,
    answers: [
      {
        answer: 'super easy',
        correct: false,
      },
      {
        answer: 'super hard',
        correct: true
      },
      {
        answer: 'hard',
        correct: false,
      }
    ],
  };
  const questionBody2 = {
    question: 'how easy iter3 is',
    duration: 30,
    points: 6,
    answers: [
      {
        answer: 'super hard',
        correct: false,
      },
      {
        answer: 'super easy',
        correct: true
      },
      {
        answer: 'hard',
        correct: false,
      }
    ],
  };
  describe('success', () => {
    test('successful moving the question', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const question1 = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody1);
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody2);
      expect(adminQuizQuestionMoveV2(quiz.quizId, question1.questionId, token.token, 1)).toStrictEqual({});
      expect(adminQuizInfoV2(quiz.quizId, token.token).questions[1].questions).toStrictEqual(question1.question);
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const question1 = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody1);
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody2);
      expect(() => adminQuizQuestionMoveV2(quiz.quizId, question1.questionId, undefined, 1)).toThrow(HTTPError[401]);
    });

    test('Provided token is valid structure, but is not for a currently logged in session', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const question1 = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody1);
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody2);
      adminAuthLogoutV2(token.token);
      expect(() => adminQuizQuestionMoveV2(quiz.quizId, question1.questionId, token.token, 1)).toThrow(HTTPError[403]);
    });

    test('Quiz ID does not refer to a valid quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const question1 = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody1);
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody2);
      expect(() => adminQuizQuestionMoveV2(quiz.quizId + 1, question1.questionId, token.token, 1)).toThrow(HTTPError[400]);
    });

    test('Quiz ID does not refer to a quiz that this user owns', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const newtoken = adminAuthRegister('newvalidEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const question1 = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody1);
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody2);
      expect(() => adminQuizQuestionMoveV2(quiz.quizId, question1.questionId, newtoken.token, 1)).toThrow(HTTPError[400]);
    });

    test('Question Id does not refer to a valid question within this quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const question1 = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody1);
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody2);
      expect(() => adminQuizQuestionMoveV2(quiz.quizId, question1.questionId + 999, token.token, 1)).toThrow(HTTPError[400]);
    });

    test('NewPosition is less than 0, or NewPosition is greater than n-1 where n is the number of questions', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const question1 = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody1);
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody2);
      expect(() => adminQuizQuestionMoveV2(quiz.quizId, question1.questionId, token.token, -1)).toThrow(HTTPError[400]);
    });

    test('NewPosition is the position of the current question', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const question1 = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody1);
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody2);
      expect(() => adminQuizQuestionMoveV2(quiz.quizId, question1.questionId, token.token, 0)).toThrow(HTTPError[400]);
    });
  });
});

// adminQuizQuestionDuplicateV2 Testing
describe('adminQuizQuestionDuplicateV2', () => {
  const questionBody = {
    question: 'how hard iter3 is',
    duration: 20,
    points: 5,
    answers: [
      {
        answer: 'super easy',
        correct: false,
      },
      {
        answer: 'super hard',
        correct: true
      },
      {
        answer: 'hard',
        correct: false,
      }
    ],
  };
  describe('success', () => {
    test('successful duplicating the quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      expect(adminQuizQuestionDuplicateV2(quiz.quizId, question.questionId, token.token)).toStrictEqual({ questionId: expect.any(Number) });
      expect(adminQuizInfoV2(quiz.quizId, token.token)).toStrictEqual({
        quizId: quiz.quizId,
        name: 'valid quiz name',
        timeCreated: expect.any(Number),
        timeLastEdited: expect.any(Number),
        description: 'valid quiz description',
        numQuestions: expect.any(Number),
        questions: [
          {
            questionId: expect.any(Number),
            question: 'how hard iter3 is',
            duration: 20,
            points: 5,
            answers: [
              {
                answerId: expect.any(Number),
                answer: 'super easy',
                colour: expect.any(String),
                correct: false,
              },
              {
                answerId: expect.any(Number),
                answer: 'super hard',
                colour: expect.any(String),
                correct: true
              },
              {
                answerId: expect.any(Number),
                answer: 'hard',
                colour: expect.any(String),
                correct: false,
              }
            ],
          },
          {
            questionId: expect.any(Number),
            question: 'how hard iter3 is',
            duration: 20,
            points: 5,
            answers: [
              {
                answerId: expect.any(Number),
                answer: 'super easy',
                colour: expect.any(String),
                correct: false,
              },
              {
                answerId: expect.any(Number),
                answer: 'super hard',
                colour: expect.any(String),
                correct: true
              },
              {
                answerId: expect.any(Number),
                answer: 'hard',
                colour: expect.any(String),
                correct: false,
              }
            ],
          }
        ],
        duration: expect.any(Number),
        thumbnailUrl: '',
      });
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      expect(() => adminQuizQuestionDuplicateV2(quiz.quizId, question.questionId, undefined)).toThrow(HTTPError[401]);
    });

    test('Provided token is valid structure, but is not for a currently logged in session', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      adminAuthLogoutV2(token.token);
      expect(() => adminQuizQuestionDuplicateV2(quiz.quizId, question.questionId, token.token)).toThrow(HTTPError[403]);
    });

    test('Quiz ID does not refer to a valid quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      expect(() => adminQuizQuestionDuplicateV2(quiz.quizId + 1, question.questionId, token.token)).toThrow(HTTPError[400]);
    });

    test('Quiz ID does not refer to a quiz that this user owns', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const newtoken = adminAuthRegister('newvalidEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      expect(() => adminQuizQuestionDuplicateV2(quiz.quizId, question.questionId, newtoken.token)).toThrow(HTTPError[400]);
    });

    test('Question Id does not refer to a valid question within this quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const question = adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      expect(() => adminQuizQuestionDuplicateV2(quiz.quizId, question.questionId + 1, token.token)).toThrow(HTTPError[400]);
    });
  });
});
// ========================= Iter3 (New) Testing========================

// adminQuizThumbnailUpdate Testing
describe('adminQuizThumbnailUpdate', () => {
  const imgUrl = 'https://static.wikia.nocookie.net/youtube/images/3/35/Pusheenthecat.jpeg';
  describe('success', () => {
    test('successful updating quiz thumbnailUrl', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      expect(adminQuizThumbnailUpdate(quiz.quizId, token.token, imgUrl)).toStrictEqual({});
      expect(adminQuizInfoV2(quiz.quizId, token.token)).toStrictEqual({
        quizId: quiz.quizId,
        name: 'valid quiz name',
        timeCreated: expect.any(Number),
        timeLastEdited: expect.any(Number),
        description: 'valid quiz description',
        numQuestions: 0,
        questions: [],
        duration: 0,
        thumbnailUrl: expect.any(String),
      });
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizThumbnailUpdate(quiz.quizId, undefined, imgUrl)).toThrow(HTTPError[401]);
    });

    test('Provided token is valid structure, but is not for a currently logged in session', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminAuthLogoutV2(token.token);
      expect(() => adminQuizThumbnailUpdate(quiz.quizId, token.token, imgUrl)).toThrow(HTTPError[403]);
    });

    test('Quiz ID does not refer to a valid quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizThumbnailUpdate(quiz.quizId + 1, token.token, imgUrl)).toThrow(HTTPError[400]);
    });

    test('Quiz ID does not refer to a quiz that this user owns', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const newtoken = adminAuthRegister('newvalidEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizThumbnailUpdate(quiz.quizId, newtoken.token, imgUrl)).toThrow(HTTPError[400]);
    });

    test('imgUrl when fetched does not return a valid file', () => {
      const wrongImagUrl = 'https://en.wikipedia.org/';
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizThumbnailUpdate(quiz.quizId, token.token, wrongImagUrl)).toThrow(HTTPError[400]);
    });

    test('Provided token is valid structure, but is not for a currently logged in session', () => {
      const wrongImagUrl = 'https://user-images.githubusercontent.com/14011726/94132137-7d4fc100-fe7c-11ea-8512-69f90cb65e48.gif';
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizThumbnailUpdate(quiz.quizId, token.token, wrongImagUrl)).toThrow(HTTPError[400]);
    });
  });
});

// adminQuizSessionView Testing
describe('adminQuizSessioView', () => {
  const questionBody = {
    question: 'how hard iter3 is',
    duration: 20,
    points: 5,
    answers: [
      {
        answer: 'super easy',
        correct: false,
      },
      {
        answer: 'super hard',
        correct: true
      },
      {
        answer: 'hard',
        correct: false,
      }
    ],
  };
  describe('success', () => {
    test('successful viewing sessions', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session1 = adminQuizSessionStart(quiz.quizId, token.token, 3);
      const session2 = adminQuizSessionStart(quiz.quizId, token.token, 3);
      adminQuizSessionUpdate(quiz.quizId, session1.sessionId, token.token, 'END');
      expect(adminQuizSessionView(token.token, quiz.quizId)).toStrictEqual({
        activeSessions: [session2.sessionId],
        inactiveSessions: [session1.sessionId],
      });
    });
  });
});

// adminQuizSessionStart Testing
describe('adminQuizSessionStart', () => {
  const questionBody = {
    question: 'how hard iter3 is',
    duration: 20,
    points: 5,
    answers: [
      {
        answer: 'super easy',
        correct: false,
      },
      {
        answer: 'super hard',
        correct: true
      },
      {
        answer: 'hard',
        correct: false,
      }
    ],
  };
  describe('success', () => {
    test('successful starting a session', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      expect(adminQuizSessionStart(quiz.quizId, token.token, 3)).toStrictEqual({ sessionId: expect.any(Number) });
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      expect(() => adminQuizSessionStart(quiz.quizId, undefined, 3)).toThrow(HTTPError[401]);
    });

    test('Provided token is valid structure, but is not for a currently logged in session', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      adminAuthLogoutV2(token.token);
      expect(() => adminQuizSessionStart(quiz.quizId, token.token, 3)).toThrow(HTTPError[403]);
    });

    test('Quiz ID does not refer to a valid quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      expect(() => adminQuizSessionStart(quiz.quizId + 1, token.token, 3)).toThrow(HTTPError[400]);
    });

    test('Quiz ID does not refer to a quiz that this user owns', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const newtoken = adminAuthRegister('newvalidEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      expect(() => adminQuizSessionStart(quiz.quizId, newtoken.token, 3)).toThrow(HTTPError[400]);
    });

    test('autoStartNum is a number greater than 50', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      expect(() => adminQuizSessionStart(quiz.quizId, token.token, 51)).toThrow(HTTPError[400]);
    });

    test('A maximum of 10 sessions that are not in END state currently exist', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      adminQuizSessionStart(quiz.quizId, token.token, 3);
      adminQuizSessionStart(quiz.quizId, token.token, 3);
      adminQuizSessionStart(quiz.quizId, token.token, 3);
      adminQuizSessionStart(quiz.quizId, token.token, 3);
      adminQuizSessionStart(quiz.quizId, token.token, 3);
      adminQuizSessionStart(quiz.quizId, token.token, 3);
      adminQuizSessionStart(quiz.quizId, token.token, 3);
      adminQuizSessionStart(quiz.quizId, token.token, 3);
      adminQuizSessionStart(quiz.quizId, token.token, 3);
      adminQuizSessionStart(quiz.quizId, token.token, 3);
      expect(() => adminQuizSessionStart(quiz.quizId, token.token, 3)).toThrow(HTTPError[400]);
    });

    test('The quiz does not have any questions in it', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      expect(() => adminQuizSessionStart(quiz.quizId, token.token, 3)).toThrow(HTTPError[400]);
    });
  });
});

// adminQuizSessionUpdate Testing
describe('adminQuizSessionUpdate', () => {
  const questionBody = {
    question: 'how hard iter3 is',
    duration: 0.1,
    points: 5,
    answers: [
      {
        answer: 'super easy',
        correct: false,
      },
      {
        answer: 'super hard',
        correct: true
      },
      {
        answer: 'hard',
        correct: false,
      }
    ],
  };

  describe('success', () => {
    test('successful updating session', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      expect(adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'NEXT_QUESTION')).toStrictEqual({});
      sleepSync(0.1 * 1000);
      expect(adminQuizSessionStatus(quiz.quizId, session.sessionId, token.token).state).toStrictEqual('QUESTION_OPEN');
      sleepSync(0.1 * 1000);
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      expect(() => adminQuizSessionUpdate(quiz.quizId, session.sessionId, undefined, 'NEXT_QUESTION')).toThrow(HTTPError[401]);
    });

    test('Provided token is valid structure, but is not for a currently logged in session', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      adminAuthLogoutV2(token.token);
      expect(() => adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'NEXT_QUESTION')).toThrow(HTTPError[403]);
    });

    test('Quiz ID does not refer to a valid quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      expect(() => adminQuizSessionUpdate(quiz.quizId + 1, session.sessionId, token.token, 'NEXT_QUESTION')).toThrow(HTTPError[400]);
    });

    test('Quiz ID does not refer to a quiz that this user owns', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const newtoken = adminAuthRegister('newvalidEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      expect(() => adminQuizSessionUpdate(quiz.quizId, session.sessionId, newtoken.token, 'NEXT_QUESTION')).toThrow(HTTPError[400]);
    });

    test('Session Id does not refer to a valid session within this quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      expect(() => adminQuizSessionUpdate(quiz.quizId, session.sessionId + 1, token.token, 'NEXT_QUESTION')).toThrow(HTTPError[400]);
    });

    test('Action provided is not a valid Action enum', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      expect(() => adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'GO_BACK_RESULT')).toThrow(HTTPError[400]);
    });

    test('Action(GO_TO_ANSWER) enum cannot be applied in the current state (see spec for details)', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      expect(() => adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'GO_TO_ANSWER')).toThrow(HTTPError[400]);
    });

    test('Action(NEXT_QUESTION) enum cannot be applied in the current state (see spec for details)', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'END');
      expect(() => adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'NEXT_QUESTION')).toThrow(HTTPError[400]);
    });

    test('Action(GO_TO_RESULTS) enum cannot be applied in the current state (see spec for details)', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'END');
      expect(() => adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'GO_TO_FINAL_RESULTS')).toThrow(HTTPError[400]);
    });

    test('Action(END) enum cannot be applied in the current state (see spec for details)', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'END');
      expect(() => adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'END')).toThrow(HTTPError[400]);
    });
  });
});

// adminQuizSessionStatus Testing
describe('adminQuizSessionStatus', () => {
  const questionBody = {
    question: 'how hard iter3 is',
    duration: 2,
    points: 5,
    answers: [
      {
        answer: 'super easy',
        correct: false,
      },
      {
        answer: 'super hard',
        correct: true
      },
      {
        answer: 'hard',
        correct: false,
      }
    ],
  };
  describe('success', () => {
    test('successful getting status', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      expect(adminQuizSessionStatus(quiz.quizId, session.sessionId, token.token)).toStrictEqual({
        state: 'LOBBY',
        atQuestion: 0,
        players: [],
        metadata: {
          quizId: quiz.quizId,
          name: 'valid quiz name',
          timeCreated: expect.any(Number),
          timeLastEdited: expect.any(Number),
          description: 'valid quiz description',
          numQuestions: 1,
          questions: [
            {
              questionId: expect.any(Number),
              question: 'how hard iter3 is',
              duration: 2,
              points: 5,
              answers: [
                {
                  answerId: expect.any(Number),
                  answer: 'super easy',
                  colour: expect.any(String),
                  correct: false,
                },
                {
                  answerId: expect.any(Number),
                  answer: 'super hard',
                  colour: expect.any(String),
                  correct: true
                },
                {
                  answerId: expect.any(Number),
                  answer: 'hard',
                  colour: expect.any(String),
                  correct: false,
                }
              ],
            }
          ],
          duration: expect.any(Number),
          thumbnailUrl: '',
        }
      });
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      expect(() => adminQuizSessionStatus(quiz.quizId, session.sessionId, undefined)).toThrow(HTTPError[401]);
    });

    test('Provided token is valid structure, but is not for a currently logged in session', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      adminAuthLogoutV2(token.token);
      expect(() => adminQuizSessionStatus(quiz.quizId, session.sessionId, token.token)).toThrow(HTTPError[403]);
    });

    test('Quiz ID does not refer to a valid quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      expect(() => adminQuizSessionStatus(quiz.quizId + 1, session.sessionId, token.token)).toThrow(HTTPError[400]);
    });

    test('Quiz ID does not refer to a quiz that this user owns', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const newtoken = adminAuthRegister('newvalidEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      expect(() => adminQuizSessionStatus(quiz.quizId, session.sessionId, newtoken.token)).toThrow(HTTPError[400]);
    });

    test('Session Id does not refer to a valid session within this quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      expect(() => adminQuizSessionStatus(quiz.quizId, session.sessionId + 1, token.token)).toThrow(HTTPError[400]);
    });
  });
});

// adminQuizSessionResult Testing
describe('adminQuizSessionResult', () => {
  const questionBody = {
    question: 'how hard iter3 is',
    duration: 0.5,
    points: 5,
    answers: [
      {
        answer: 'super easy',
        correct: false,
      },
      {
        answer: 'super hard',
        correct: true
      },
      {
        answer: 'hard',
        correct: false,
      }
    ],
    thumbnailUrl: 'https://static.wikia.nocookie.net/youtube/images/3/35/Pusheenthecat.jpeg',
  };
  describe('success', () => {
    test('successful get session result', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      const player = guestPlayerJoin(session.sessionId, 'Peter Parker');
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'NEXT_QUESTION');
      sleepSync(0.1 * 1000);
      const answerId1 = guestPlayerQuestionInfo(player.playerId, 1).answers[0].answerId;
      const answerId2 = guestPlayerQuestionInfo(player.playerId, 1).answers[1].answerId;
      guestPlayerAnswerSubmit([answerId1, answerId2], player.playerId, 1);
      sleepSync(0.5 * 1000);
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'GO_TO_FINAL_RESULTS');
      expect(adminQuizSessionResult(quiz.quizId, session.sessionId, token.token)).toStrictEqual(
        {
          usersRankedByScore: [
            {
              name: 'Peter Parker',
              score: 0,
            },
          ],
          questionResults: [
            {
              questionId: expect.any(Number),
              questionCorrectBreakdown: [
                {
                  answerId: answerId2,
                  playersCorrect: [],
                }
              ],
              averageAnswerTime: expect.any(Number),
              percentCorrect: expect.any(Number),
            }
          ]
        }
      );
      sleepSync(0.1 * 1000);
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      const player = guestPlayerJoin(session.sessionId, 'Peter Parker');
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'NEXT_QUESTION');
      sleepSync(0.1 * 1000);
      const answerId1 = guestPlayerQuestionInfo(player.playerId, 1).answers[0].answerId;
      const answerId2 = guestPlayerQuestionInfo(player.playerId, 1).answers[1].answerId;
      guestPlayerAnswerSubmit([answerId1, answerId2], player.playerId, 1);
      sleepSync(0.5 * 1000);
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'GO_TO_FINAL_RESULTS');
      expect(() => adminQuizSessionResult(quiz.quizId, session.sessionId, undefined)).toThrow(HTTPError[401]);
      sleepSync(0.1 * 1000);
    });

    test('Provided token is valid structure, but is not for a currently logged in session', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      const player = guestPlayerJoin(session.sessionId, 'Peter Parker');
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'NEXT_QUESTION');
      sleepSync(0.1 * 1000);
      const answerId1 = guestPlayerQuestionInfo(player.playerId, 1).answers[0].answerId;
      const answerId2 = guestPlayerQuestionInfo(player.playerId, 1).answers[1].answerId;
      guestPlayerAnswerSubmit([answerId1, answerId2], player.playerId, 1);
      sleepSync(0.5 * 1000);
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'GO_TO_FINAL_RESULTS');
      adminAuthLogoutV2(token.token);
      expect(() => adminQuizSessionResult(quiz.quizId, session.sessionId, token.token)).toThrow(HTTPError[403]);
      sleepSync(0.1 * 1000);
    });

    test('Quiz ID does not refer to a valid quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      const player = guestPlayerJoin(session.sessionId, 'Peter Parker');
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'NEXT_QUESTION');
      sleepSync(0.1 * 1000);
      const answerId1 = guestPlayerQuestionInfo(player.playerId, 1).answers[0].answerId;
      const answerId2 = guestPlayerQuestionInfo(player.playerId, 1).answers[1].answerId;
      guestPlayerAnswerSubmit([answerId1, answerId2], player.playerId, 1);
      sleepSync(0.5 * 1000);
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'GO_TO_FINAL_RESULTS');
      expect(() => adminQuizSessionResult(quiz.quizId + 1, session.sessionId, token.token)).toThrow(HTTPError[400]);
      sleepSync(0.1 * 1000);
    });

    test('Quiz ID does not refer to a quiz that this user owns', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const newtoken = adminAuthRegister('newvalidEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      const player = guestPlayerJoin(session.sessionId, 'Peter Parker');
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'NEXT_QUESTION');
      sleepSync(0.1 * 1000);
      const answerId1 = guestPlayerQuestionInfo(player.playerId, 1).answers[0].answerId;
      const answerId2 = guestPlayerQuestionInfo(player.playerId, 1).answers[1].answerId;
      guestPlayerAnswerSubmit([answerId1, answerId2], player.playerId, 1);
      sleepSync(0.5 * 1000);
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'GO_TO_FINAL_RESULTS');
      expect(() => adminQuizSessionResult(quiz.quizId, session.sessionId, newtoken.token)).toThrow(HTTPError[400]);
      sleepSync(0.1 * 1000);
    });

    test('Session Id does not refer to a valid session within this quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      const player = guestPlayerJoin(session.sessionId, 'Peter Parker');
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'NEXT_QUESTION');
      sleepSync(0.1 * 1000);
      const answerId1 = guestPlayerQuestionInfo(player.playerId, 1).answers[0].answerId;
      const answerId2 = guestPlayerQuestionInfo(player.playerId, 1).answers[1].answerId;
      guestPlayerAnswerSubmit([answerId1, answerId2], player.playerId, 1);
      sleepSync(0.5 * 1000);
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'GO_TO_FINAL_RESULTS');
      expect(() => adminQuizSessionResult(quiz.quizId, session.sessionId + 1, token.token)).toThrow(HTTPError[400]);
      sleepSync(0.1 * 1000);
    });

    test('Session is not in FINAL_RESULTS state', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      const player = guestPlayerJoin(session.sessionId, 'Peter Parker');
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'NEXT_QUESTION');
      sleepSync(0.1 * 1000);
      const answerId1 = guestPlayerQuestionInfo(player.playerId, 1).answers[0].answerId;
      const answerId2 = guestPlayerQuestionInfo(player.playerId, 1).answers[1].answerId;
      guestPlayerAnswerSubmit([answerId1, answerId2], player.playerId, 1);
      sleepSync(0.5 * 1000);
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'GO_TO_ANSWER');
      expect(() => adminQuizSessionResult(quiz.quizId, session.sessionId, token.token)).toThrow(HTTPError[400]);
      sleepSync(0.1 * 1000);
    });
  });
});

// adminQuizSessionResultCSV Testing
describe('adminQuizSessionResultCSV', () => {
  const questionBody = {
    question: 'how hard iter3 is',
    duration: 0.5,
    points: 5,
    answers: [
      {
        answer: 'super easy',
        correct: true,
      },
      {
        answer: 'super hard',
        correct: true
      },
      {
        answer: 'hard',
        correct: false,
      }
    ],
  };
  describe('success', () => {
    test('successful return csv url', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      const player = guestPlayerJoin(session.sessionId, 'Peter Parker');
      guestPlayerJoin(session.sessionId, 'Hayden Smith');
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'NEXT_QUESTION');
      sleepSync(0.1 * 1000);
      const answerId1 = guestPlayerQuestionInfo(player.playerId, 1).answers[0].answerId;
      const answerId2 = guestPlayerQuestionInfo(player.playerId, 1).answers[1].answerId;
      guestPlayerAnswerSubmit([answerId1, answerId2], player.playerId, 1);
      sleepSync(0.5 * 1000);
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'GO_TO_FINAL_RESULTS');
      expect(adminQuizSessionResultCSV(quiz.quizId, session.sessionId, token.token)).toStrictEqual({
        url: expect.any(String),
      });
      sleepSync(0.1 * 1000);
    });
  });

  describe('failure', () => {
    test('Token is not a valid structure', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      const player = guestPlayerJoin(session.sessionId, 'Peter Parker');
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'NEXT_QUESTION');
      sleepSync(0.1 * 1000);
      const answerId1 = guestPlayerQuestionInfo(player.playerId, 1).answers[0].answerId;
      const answerId2 = guestPlayerQuestionInfo(player.playerId, 1).answers[1].answerId;
      guestPlayerAnswerSubmit([answerId1, answerId2], player.playerId, 1);
      sleepSync(0.5 * 1000);
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'GO_TO_FINAL_RESULTS');
      expect(() => adminQuizSessionResultCSV(quiz.quizId, session.sessionId, undefined)).toThrow(HTTPError[401]);
      sleepSync(0.1 * 1000);
    });

    test('Provided token is valid structure, but is not for a currently logged in session', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      const player = guestPlayerJoin(session.sessionId, 'Peter Parker');
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'NEXT_QUESTION');
      sleepSync(0.1 * 1000);
      const answerId1 = guestPlayerQuestionInfo(player.playerId, 1).answers[0].answerId;
      const answerId2 = guestPlayerQuestionInfo(player.playerId, 1).answers[1].answerId;
      guestPlayerAnswerSubmit([answerId1, answerId2], player.playerId, 1);
      sleepSync(0.5 * 1000);
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'GO_TO_FINAL_RESULTS');
      adminAuthLogoutV2(token.token);
      expect(() => adminQuizSessionResultCSV(quiz.quizId, session.sessionId, token.token)).toThrow(HTTPError[403]);
      sleepSync(0.1 * 1000);
    });

    test('Quiz ID does not refer to a valid quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      const player = guestPlayerJoin(session.sessionId, 'Peter Parker');
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'NEXT_QUESTION');
      sleepSync(0.1 * 1000);
      const answerId1 = guestPlayerQuestionInfo(player.playerId, 1).answers[0].answerId;
      const answerId2 = guestPlayerQuestionInfo(player.playerId, 1).answers[1].answerId;
      guestPlayerAnswerSubmit([answerId1, answerId2], player.playerId, 1);
      sleepSync(0.5 * 1000);
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'GO_TO_FINAL_RESULTS');
      expect(() => adminQuizSessionResultCSV(quiz.quizId + 1, session.sessionId, token.token)).toThrow(HTTPError[400]);
      sleepSync(0.1 * 1000);
    });

    test('Quiz ID does not refer to a quiz that this user owns', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const newtoken = adminAuthRegister('newvalidEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      const player = guestPlayerJoin(session.sessionId, 'Peter Parker');
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'NEXT_QUESTION');
      sleepSync(0.1 * 1000);
      const answerId1 = guestPlayerQuestionInfo(player.playerId, 1).answers[0].answerId;
      const answerId2 = guestPlayerQuestionInfo(player.playerId, 1).answers[1].answerId;
      guestPlayerAnswerSubmit([answerId1, answerId2], player.playerId, 1);
      sleepSync(0.5 * 1000);
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'GO_TO_FINAL_RESULTS');
      expect(() => adminQuizSessionResultCSV(quiz.quizId, session.sessionId, newtoken.token)).toThrow(HTTPError[400]);
      sleepSync(0.1 * 1000);
    });

    test('Session Id does not refer to a valid question within this quiz', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      const player = guestPlayerJoin(session.sessionId, 'Peter Parker');
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'NEXT_QUESTION');
      sleepSync(0.1 * 1000);
      const answerId1 = guestPlayerQuestionInfo(player.playerId, 1).answers[0].answerId;
      const answerId2 = guestPlayerQuestionInfo(player.playerId, 1).answers[1].answerId;
      guestPlayerAnswerSubmit([answerId1, answerId2], player.playerId, 1);
      sleepSync(0.5 * 1000);
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'GO_TO_FINAL_RESULTS');
      expect(() => adminQuizSessionResultCSV(quiz.quizId, session.sessionId + 1, token.token)).toThrow(HTTPError[400]);
      sleepSync(0.1 * 1000);
    });

    test('Session is not in FINAL_RESULTS state', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      const player = guestPlayerJoin(session.sessionId, 'Peter Parker');
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'NEXT_QUESTION');
      sleepSync(0.1 * 1000);
      const answerId1 = guestPlayerQuestionInfo(player.playerId, 1).answers[0].answerId;
      const answerId2 = guestPlayerQuestionInfo(player.playerId, 1).answers[1].answerId;
      guestPlayerAnswerSubmit([answerId1, answerId2], player.playerId, 1);
      sleepSync(0.5 * 1000);
      expect(() => adminQuizSessionResultCSV(quiz.quizId, session.sessionId, token.token)).toThrow(HTTPError[400]);
      sleepSync(0.1 * 1000);
    });
  });
});

// guestPlayerJoin Testing
describe('guestPlayerJoin', () => {
  const questionBody = {
    question: 'how hard iter3 is',
    duration: 0.1,
    points: 5,
    answers: [
      {
        answer: 'super easy',
        correct: false,
      },
      {
        answer: 'super hard',
        correct: true
      },
      {
        answer: 'hard',
        correct: false,
      }
    ],
  };
  describe('success', () => {
    test('successful returning playerId', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      expect(guestPlayerJoin(session.sessionId, 'Peter Parker')).toStrictEqual({ playerId: expect.any(Number) });
    });

    test('successful returning playerId (empty name)', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      expect(guestPlayerJoin(session.sessionId, '')).toStrictEqual({ playerId: expect.any(Number) });
    });
  });

  describe('failure', () => {
    test('Name of user entered is not unique (compared to other users who have already joined)', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      guestPlayerJoin(session.sessionId, 'Peter Parker');
      expect(() => guestPlayerJoin(session.sessionId, 'Peter Parker')).toThrow(HTTPError[400]);
    });

    test('Session is not in LOBBY state', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'END');
      expect(() => guestPlayerJoin(session.sessionId, 'Peter Parker')).toThrow(HTTPError[400]);
    });

    test('State Changed(reach autoStartNum)', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      guestPlayerJoin(session.sessionId, 'Hayden Smith');
      guestPlayerJoin(session.sessionId, 'Taylor Swift');
      guestPlayerJoin(session.sessionId, 'Jim Carrey');
      expect(() => guestPlayerJoin(session.sessionId, 'Peter Parker')).toThrow(HTTPError[400]);
      sleepSync(0.2 * 1000);
    });
  });
});

// guestPlayerStatus Testing
describe('guestPlayerStatus', () => {
  const questionBody = {
    question: 'how hard iter3 is',
    duration: 20,
    points: 5,
    answers: [
      {
        answer: 'super easy',
        correct: false,
      },
      {
        answer: 'super hard',
        correct: true
      },
      {
        answer: 'hard',
        correct: false,
      }
    ],
  };
  describe('success', () => {
    test('successful getting player status', () => {
      const token = adminAuthRegister('newvalidEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'new valid quiz name', 'new valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 4);
      const player = guestPlayerJoin(session.sessionId, 'Peter Parker');
      expect(guestPlayerStatus(player.playerId)).toStrictEqual({
        state: 'LOBBY',
        numQuestions: 1,
        atQuestion: 0,
      });
    });
  });

  describe('failure', () => {
    test('If player ID does not exist', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      const player = guestPlayerJoin(session.sessionId, 'Peter Parker');
      expect(() => guestPlayerStatus(player.playerId + 1)).toThrow(HTTPError[400]);
    });
  });
});

// guestPlayerQuestionInfo Testing
describe('guestPlayerQuestionInfo', () => {
  const questionBody = {
    question: 'how hard iter3 is',
    duration: 0.1,
    points: 5,
    answers: [
      {
        answer: 'super easy',
        correct: false,
      },
      {
        answer: 'super hard',
        correct: true
      },
      {
        answer: 'hard',
        correct: false,
      }
    ],
  };
  describe('success', () => {
    test('successful getting question info', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      const player = guestPlayerJoin(session.sessionId, 'Peter Parker');
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'NEXT_QUESTION');
      sleepSync(0.2 * 1000);
      expect(guestPlayerQuestionInfo(player.playerId, 1)).toStrictEqual({
        questionId: expect.any(Number),
        question: 'how hard iter3 is',
        duration: 0.1,
        points: 5,
        answers: [
          {
            answerId: expect.any(Number),
            answer: 'super easy',
            colour: expect.any(String),
          },
          {
            answerId: expect.any(Number),
            answer: 'super hard',
            colour: expect.any(String),
          },
          {
            answerId: expect.any(Number),
            answer: 'hard',
            colour: expect.any(String),
          }
        ]
      });
    });
  });

  describe('failure', () => {
    test('If player ID does not exist', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      const player = guestPlayerJoin(session.sessionId, 'Peter Parker');
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'NEXT_QUESTION');
      sleepSync(0.2 * 1000);
      expect(() => guestPlayerQuestionInfo(player.playerId + 1, 1)).toThrow(HTTPError[400]);
    });

    test('If question position is not valid for the session this player is in', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      const player = guestPlayerJoin(session.sessionId, 'Peter Parker');
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'NEXT_QUESTION');
      sleepSync(0.2 * 1000);
      expect(() => guestPlayerQuestionInfo(player.playerId, 2)).toThrow(HTTPError[400]);
    });

    test('If session is not currently on this question', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const newquestionBody = {
        question: 'how easy iter3 is',
        duration: 0.1,
        points: 5,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
          {
            answer: 'super hard',
            correct: true
          },
          {
            answer: 'hard',
            correct: false,
          }
        ],
      };
      adminQuizQuestionCreate(quiz.quizId, token.token, newquestionBody);
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      const player = guestPlayerJoin(session.sessionId, 'Peter Parker');
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'NEXT_QUESTION');
      sleepSync(0.2 * 1000);
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'NEXT_QUESTION');
      sleepSync(0.2 * 1000);
      expect(() => guestPlayerQuestionInfo(player.playerId, 1)).toThrow(HTTPError[400]);
    });

    test('Session is in LOBBY or END state (LOBBY)', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      const player = guestPlayerJoin(session.sessionId, 'Peter Parker');
      expect(() => guestPlayerQuestionInfo(player.playerId, 1)).toThrow(HTTPError[400]);
    });

    test('Session is in LOBBY or END state (END)', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      const player = guestPlayerJoin(session.sessionId, 'Peter Parker');
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'END');
      expect(() => guestPlayerQuestionInfo(player.playerId, 1)).toThrow(HTTPError[400]);
    });
  });
});

// guestPlayerAnswerSubmit Testing
describe('guestPlayerAnswerSubmit', () => {
  const questionBody = {
    question: 'how hard iter3 is',
    duration: 0.5,
    points: 5,
    answers: [
      {
        answer: 'super easy',
        correct: false,
      },
      {
        answer: 'super hard',
        correct: true
      },
      {
        answer: 'hard',
        correct: false,
      }
    ],
  };

  describe('success', () => {
    test('successful submit answer', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      const player = guestPlayerJoin(session.sessionId, 'Peter Parker');
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'NEXT_QUESTION');
      sleepSync(0.1 * 1000);
      const answerId1 = guestPlayerQuestionInfo(player.playerId, 1).answers[0].answerId;
      const answerId2 = guestPlayerQuestionInfo(player.playerId, 1).answers[1].answerId;
      expect(guestPlayerAnswerSubmit([answerId1, answerId2], player.playerId, 1)).toStrictEqual({});
      sleepSync(0.5 * 1000);
    });
  });

  describe('failure', () => {
    test('If player ID does not exist', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      const player = guestPlayerJoin(session.sessionId, 'Peter Parker');
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'NEXT_QUESTION');
      sleepSync(0.1 * 1000);
      const answerId1 = guestPlayerQuestionInfo(player.playerId, 1).answers[0].answerId;
      const answerId2 = guestPlayerQuestionInfo(player.playerId, 1).answers[1].answerId;
      expect(() => guestPlayerAnswerSubmit([answerId1, answerId2], player.playerId + 1, 1)).toThrow(HTTPError[400]);
      sleepSync(0.5 * 1000);
    });

    test('If question position is not valid for the session this player is in', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      const player = guestPlayerJoin(session.sessionId, 'Peter Parker');
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'NEXT_QUESTION');
      sleepSync(0.1 * 1000);
      const answerId1 = guestPlayerQuestionInfo(player.playerId, 1).answers[0].answerId;
      const answerId2 = guestPlayerQuestionInfo(player.playerId, 1).answers[1].answerId;
      expect(() => guestPlayerAnswerSubmit([answerId1, answerId2], player.playerId, 3)).toThrow(HTTPError[400]);
      sleepSync(0.5 * 1000);
    });

    test('Session is not in QUESTION_OPEN state', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      const player = guestPlayerJoin(session.sessionId, 'Peter Parker');
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'NEXT_QUESTION');
      sleepSync(0.6 * 1000);
      const answerId1 = guestPlayerQuestionInfo(player.playerId, 1).answers[0].answerId;
      const answerId2 = guestPlayerQuestionInfo(player.playerId, 1).answers[1].answerId;
      expect(() => guestPlayerAnswerSubmit([answerId1, answerId2], player.playerId, 1)).toThrow(HTTPError[400]);
      sleepSync(0.5 * 1000);
    });

    test('If session is not yet up to this question', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const newquestionBody = {
        question: 'how easy iter3 is',
        duration: 0.5,
        points: 5,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
          {
            answer: 'super hard',
            correct: true
          },
          {
            answer: 'hard',
            correct: false,
          }
        ],
      };
      adminQuizQuestionCreate(quiz.quizId, token.token, newquestionBody);
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      const player = guestPlayerJoin(session.sessionId, 'Peter Parker');
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'NEXT_QUESTION');
      sleepSync(0.6 * 1000);
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'NEXT_QUESTION');
      sleepSync(0.1 * 1000);
      const answerId1 = guestPlayerQuestionInfo(player.playerId, 2).answers[0].answerId;
      const answerId2 = guestPlayerQuestionInfo(player.playerId, 2).answers[1].answerId;
      expect(() => guestPlayerAnswerSubmit([answerId1, answerId2], player.playerId, 1)).toThrow(HTTPError[400]);
      sleepSync(0.5 * 1000);
    });

    test('Answer IDs are not valid for this particular question', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      const player = guestPlayerJoin(session.sessionId, 'Peter Parker');
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'NEXT_QUESTION');
      sleepSync(0.1 * 1000);
      expect(() => guestPlayerAnswerSubmit([12345, 67890], player.playerId, 1)).toThrow(HTTPError[400]);
      sleepSync(0.5 * 1000);
    });

    test('There are duplicate answer IDs provided', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      const player = guestPlayerJoin(session.sessionId, 'Peter Parker');
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'NEXT_QUESTION');
      sleepSync(0.1 * 1000);
      const answerId1 = guestPlayerQuestionInfo(player.playerId, 1).answers[0].answerId;
      expect(() => guestPlayerAnswerSubmit([answerId1, answerId1], player.playerId, 1)).toThrow(HTTPError[400]);
      sleepSync(0.5 * 1000);
    });

    test('Less than 1 answer ID was submitted', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      const player = guestPlayerJoin(session.sessionId, 'Peter Parker');
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'NEXT_QUESTION');
      sleepSync(0.1 * 1000);
      expect(() => guestPlayerAnswerSubmit([], player.playerId, 1)).toThrow(HTTPError[400]);
      sleepSync(0.5 * 1000);
    });
  });
});

// guestPlayerResult Testing
describe('guestPlayerResult', () => {
  const questionBody = {
    question: 'how hard iter3 is',
    duration: 0.5,
    points: 5,
    answers: [
      {
        answer: 'super easy',
        correct: false,
      },
      {
        answer: 'super hard',
        correct: true
      },
    ],
  };
  describe('success', () => {
    test('successful getting result', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      const player = guestPlayerJoin(session.sessionId, 'Peter Parker');
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'NEXT_QUESTION');
      sleepSync(0.1 * 1000);
      const answerId1 = guestPlayerQuestionInfo(player.playerId, 1).answers[0].answerId;
      const answerId2 = guestPlayerQuestionInfo(player.playerId, 1).answers[1].answerId;
      guestPlayerAnswerSubmit([answerId1, answerId2], player.playerId, 1);
      sleepSync(0.5 * 1000);
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'GO_TO_ANSWER');
      expect(guestPlayerResult(player.playerId, 1)).toStrictEqual({
        averageAnswerTime: expect.any(Number),
        percentCorrect: expect.any(Number),
        questionCorrectBreakdown: [
          {
            answerId: answerId2,
            playersCorrect: [],
          }
        ],
        questionId: expect.any(Number),
      });
      sleepSync(0.1 * 1000);
    });
  });

  describe('failure', () => {
    test('If player ID does not exist', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      const player = guestPlayerJoin(session.sessionId, 'Peter Parker');
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'NEXT_QUESTION');
      sleepSync(0.1 * 1000);
      const answerId1 = guestPlayerQuestionInfo(player.playerId, 1).answers[0].answerId;
      const answerId2 = guestPlayerQuestionInfo(player.playerId, 1).answers[1].answerId;
      guestPlayerAnswerSubmit([answerId1, answerId2], player.playerId, 1);
      sleepSync(0.5 * 1000);
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'GO_TO_ANSWER');
      expect(() => guestPlayerResult(player.playerId + 1, 1)).toThrow(HTTPError[400]);
      sleepSync(0.1 * 1000);
    });

    test('If question position is not valid for the session this player is in', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      const player = guestPlayerJoin(session.sessionId, 'Peter Parker');
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'NEXT_QUESTION');
      sleepSync(0.1 * 1000);
      const answerId1 = guestPlayerQuestionInfo(player.playerId, 1).answers[0].answerId;
      const answerId2 = guestPlayerQuestionInfo(player.playerId, 1).answers[1].answerId;
      guestPlayerAnswerSubmit([answerId1, answerId2], player.playerId, 1);
      sleepSync(0.5 * 1000);
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'GO_TO_ANSWER');
      expect(() => guestPlayerResult(player.playerId, 3)).toThrow(HTTPError[400]);
      sleepSync(0.1 * 1000);
    });

    test('Session is not in ANSWER_SHOW state', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      const player = guestPlayerJoin(session.sessionId, 'Peter Parker');
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'NEXT_QUESTION');
      sleepSync(0.1 * 1000);
      const answerId1 = guestPlayerQuestionInfo(player.playerId, 1).answers[0].answerId;
      const answerId2 = guestPlayerQuestionInfo(player.playerId, 1).answers[1].answerId;
      guestPlayerAnswerSubmit([answerId1, answerId2], player.playerId, 1);
      sleepSync(0.5 * 1000);
      expect(() => guestPlayerResult(player.playerId, 1)).toThrow(HTTPError[400]);
      sleepSync(0.1 * 1000);
    });

    test('If session is not yet up to this question', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      const newquestionBody = {
        question: 'how easy iter3 is',
        duration: 0.1,
        points: 5,
        answers: [
          {
            answer: 'super easy',
            correct: false,
          },
          {
            answer: 'super hard',
            correct: true
          },
          {
            answer: 'hard',
            correct: false,
          }
        ],
      };
      adminQuizQuestionCreate(quiz.quizId, token.token, newquestionBody);
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      const player = guestPlayerJoin(session.sessionId, 'Peter Parker');
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'NEXT_QUESTION');
      sleepSync(0.6 * 1000);
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'NEXT_QUESTION');
      sleepSync(0.1 * 1000);
      const answerId1 = guestPlayerQuestionInfo(player.playerId, 2).answers[0].answerId;
      const answerId2 = guestPlayerQuestionInfo(player.playerId, 2).answers[1].answerId;
      guestPlayerAnswerSubmit([answerId1, answerId2], player.playerId, 2);
      sleepSync(0.5 * 1000);
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'GO_TO_ANSWER');
      expect(() => guestPlayerResult(player.playerId, 1)).toThrow(HTTPError[400]);
      sleepSync(0.1 * 1000);
    });
  });
});

describe('guestPlayerSessionResult', () => {
  const questionBody = {
    question: 'how hard iter3 is',
    duration: 0.5,
    points: 5,
    answers: [
      {
        answer: 'super easy',
        correct: true,
      },
      {
        answer: 'super hard',
        correct: true
      },
      {
        answer: 'hard',
        correct: true,
      }
    ],
  };
  describe('success', () => {
    test('success getting session result', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      const player = guestPlayerJoin(session.sessionId, 'Peter Parker');
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'NEXT_QUESTION');
      sleepSync(0.1 * 1000);
      const answerId1 = guestPlayerQuestionInfo(player.playerId, 1).answers[0].answerId;
      const answerId2 = guestPlayerQuestionInfo(player.playerId, 1).answers[1].answerId;
      const answerId3 = guestPlayerQuestionInfo(player.playerId, 1).answers[2].answerId;
      guestPlayerAnswerSubmit([answerId1, answerId2, answerId3], player.playerId, 1);
      sleepSync(0.5 * 1000);
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'GO_TO_FINAL_RESULTS');
      expect(guestPlayerSessionResult(player.playerId)).toStrictEqual(
        {
          usersRankedByScore: [
            {
              name: 'Peter Parker',
              score: expect.any(Number),
            },
          ],
          questionResults: [
            {
              questionId: expect.any(Number),
              questionCorrectBreakdown: [
                {
                  answerId: answerId1,
                  playersCorrect: [],
                },
                {
                  answerId: answerId2,
                  playersCorrect: [],
                },
                {
                  answerId: answerId3,
                  playersCorrect: [],
                }
              ],
              averageAnswerTime: expect.any(Number),
              percentCorrect: expect.any(Number),
            }
          ]
        }
      );
      sleepSync(0.1 * 1000);
    });
  });

  describe('failure', () => {
    test('If player ID does not exist', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      const player = guestPlayerJoin(session.sessionId, 'Peter Parker');
      expect(() => guestPlayerSessionResult(player.playerId + 1)).toThrow(HTTPError[400]);
      sleepSync(0.1 * 1000);
    });

    test('Session is not in FINAL_RESULTS state', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      const player = guestPlayerJoin(session.sessionId, 'Peter Parker');
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'NEXT_QUESTION');
      sleepSync(0.1 * 1000);
      const answerId1 = guestPlayerQuestionInfo(player.playerId, 1).answers[0].answerId;
      const answerId2 = guestPlayerQuestionInfo(player.playerId, 1).answers[1].answerId;
      guestPlayerAnswerSubmit([answerId1, answerId2], player.playerId, 1);
      sleepSync(0.5 * 1000);
      adminQuizSessionUpdate(quiz.quizId, session.sessionId, token.token, 'GO_TO_ANSWER');
      sleepSync(0.1 * 1000);
      expect(() => guestPlayerSessionResult(player.playerId)).toThrow(HTTPError[400]);
      sleepSync(0.1 * 1000);
    });
  });
});

// playerMessageSend Testing
describe('playerMessageSend', () => {
  const questionBody = {
    question: 'how hard iter3 is',
    duration: 20,
    points: 5,
    answers: [
      {
        answer: 'super easy',
        correct: false,
      },
      {
        answer: 'super hard',
        correct: true
      },
      {
        answer: 'hard',
        correct: false,
      }
    ],
  };
  const message = {
    messageBody: 'Hello everyone!'
  };
  describe('success', () => {
    test('successful sending messsage', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      const player = guestPlayerJoin(session.sessionId, 'Peter Parker');
      expect(playerMessageSend(player.playerId, message)).toStrictEqual({});
    });
  });

  describe('failure', () => {
    test('If player ID does not exist', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      const player = guestPlayerJoin(session.sessionId, 'Peter Parker');
      expect(() => playerMessageSend(player.playerId + 1, message)).toThrow(HTTPError[400]);
    });

    test('If message body is less than 1 character or more than 100 characters', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      const player = guestPlayerJoin(session.sessionId, 'Peter Parker');
      const invalidMessage = {
        messageBody: '',
      };
      expect(() => playerMessageSend(player.playerId, invalidMessage)).toThrow(HTTPError[400]);
    });
  });
});

// playerMessageView Testing
describe('playerMessageView', () => {
  const questionBody = {
    question: 'how hard iter3 is',
    duration: 20,
    points: 5,
    answers: [
      {
        answer: 'super easy',
        correct: false,
      },
      {
        answer: 'super hard',
        correct: true
      },
      {
        answer: 'hard',
        correct: false,
      }
    ],
  };
  const message = {
    messageBody: 'Hello everyone!'
  };
  describe('success', () => {
    test('successful viewing messages', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      const player1 = guestPlayerJoin(session.sessionId, 'Peter Parker');
      const player2 = guestPlayerJoin(session.sessionId, 'Taylor Swift');
      playerMessageSend(player1.playerId, message);
      const message2 = {
        messageBody: 'Hi everyone!'
      };
      playerMessageSend(player2.playerId, message2);
      expect(playerMessageView(player1.playerId)).toStrictEqual({
        messages: [
          {
            messageBody: 'Hello everyone!',
            playerId: player1.playerId,
            playerName: 'Peter Parker',
            timeSent: expect.any(Number),
          },
          {
            messageBody: 'Hi everyone!',
            playerId: player2.playerId,
            playerName: 'Taylor Swift',
            timeSent: expect.any(Number),
          },
        ]
      });
    });
  });

  describe('failure', () => {
    test('If player ID does not exist', () => {
      const token = adminAuthRegister('validEmail@unsw.edu.au', 'validPassword!123', 'Peter', 'Parker');
      const quiz = adminQuizCreateV2(token.token, 'valid quiz name', 'valid quiz description');
      adminQuizQuestionCreate(quiz.quizId, token.token, questionBody);
      const session = adminQuizSessionStart(quiz.quizId, token.token, 3);
      const player = guestPlayerJoin(session.sessionId, 'Peter Parker');
      playerMessageSend(player.playerId, message);
      expect(() => playerMessageView(player.playerId + 1)).toThrow(HTTPError[400]);
    });
  });
});
