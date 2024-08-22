import { getData, setData, Question, States, QuizSession, PlayerInfo, PlayerMessage, QuestionResult, Actions, PlayerAnswerTime } from './dataStore';
import HTTPError from 'http-errors';
import request from 'sync-request';
import fs from 'fs';
import { port, url } from './config.json';

// ====================================================================
// ========================= Helper Function ==========================
// ====================================================================
function generateRandomColour(): string {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}
function generateRandomNumber(): number {
  return Math.floor(Math.random() * 10000) + 1;
}
function generateRandomName(): string {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const usedNames: Set<string> = new Set();

  function getRandomString(source: string, length: number): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * source.length);
      result += source[randomIndex];
    }
    return result;
  }

  function isUnique(name: string): boolean {
    if (usedNames.has(name)) {
      return false;
    }

    const letterPart = name.slice(0, 5);
    const numberPart = name.slice(5);

    // Check for repetitions of letters
    const letterSet = new Set(letterPart);
    if (letterSet.size !== letterPart.length) {
      return false;
    }

    // Check for repetitions of numbers
    const numberSet = new Set(numberPart);
    if (numberSet.size !== numberPart.length) {
      return false;
    }

    return true;
  }

  let randomName = '';
  do {
    randomName = getRandomString(letters, 5) + getRandomString(numbers, 3);
  } while (!isUnique(randomName));

  usedNames.add(randomName);
  return randomName;
}
const SERVER_URL = `${url}:${port}`;

interface AnswerHasNoCorrect {
  answerId: number;
  answer: string;
  colour: string;
}

// ====================================================================
// ========================= iter2 (Using iter1) ======================
// ====================================================================

/**
 * Provide a list of all quizzes that are owned by the currently
 * logged in users.
 *
 * @param {integer} authUserId - unique identifier for admin users.
 * @returns {{quizzes: {quizId: integer, name: string}}}
 */
export function adminQuizList(token: string) {
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
  const userHaveQuiz = data.userQuiz.filter((obj) => obj.userId === tokenFound.userId);

  const quizzes = userHaveQuiz.map((userQuiz) => {
    const { quizId } = userQuiz;
    const quizinfo = data.quizzes.find((obj) => obj.quizId === quizId);

    return { quizId, name: quizinfo.name };
  });
  setData(data);
  return { quizzes };
}

/**
 * Given basic details about a new quiz, create one for the logged in user.
 * return quizId.
 *
 * @param {integer} token - unique identifier for token.
 * @param {string} name - name of the new quiz
 * @param {string} description - description of the new quiz
 * @returns {{quizId: integer}}
 */
export function adminQuizCreate(token: string, name: string, description: string) {
  const data = getData();

  if (!token || typeof token !== 'string') {
    return {
      error: 'Token is not a valid structure'
    };
  }
  const checkToken = data.tokens.some(
    (obj) => obj.token === token
  );
  if (!checkToken) {
    return {
      error: 'Provided token is valid structure, but is not for a currently logged in session',
    };
  }

  // first if is testing if it is not alphanumeric and tesing if it has spaces
  if (!/^[0-9a-zA-Z\s]+$/.test(name)) {
    return { error: 'Name contains invalid characters. Valid characters are alphanumeric and spaces' };
  }

  // || /^\s+$/.test(name)

  if (name.length < 3 || name.length > 30) {
    return { error: 'Name is either less than 3 characters long or more than 30 characters long' };
  }

  const tokenFound = data.tokens.find((user) => user.token === token);
  const quizFound = data.userQuiz.filter((quiz) => quiz.userId === tokenFound.userId).map((userQuiz) => userQuiz.quizId);
  const nameUsed = data.quizzes.some((quiz) => quizFound.includes(quiz.quizId) && quiz.name === name);
  if (nameUsed) {
    return {
      error: 'Name is already used by the current logged in user for another quiz'
    };
  }

  if (description.length > 100) {
    return { error: 'Description is more than 100 characters in length (note: empty strings are OK)' };
  }

  const unixTimestamp = Math.floor(Date.now() / 1000);

  // check if userId already exist in dataStore
  let quizId1;

  if (data.quizzes.length === 0) {
    quizId1 = 1;
  } else {
    const i = data.quizzes.length - 1;
    quizId1 = data.quizzes[i].quizId + 1;
  }
  data.quizzes.push({
    quizId: quizId1,
    name: name,
    timeCreated: unixTimestamp,
    timeLastEdited: unixTimestamp,
    description: description,
    numQuestions: 0,
    questions: [],
    duration: 0,
  });

  const findToken = data.tokens.find((obj) => obj.token === token);

  data.userQuiz.push({
    userId: findToken.userId,
    quizId: quizId1,
  });
  setData(data);
  return {
    quizId: quizId1,
  };
}

/**
 * Given a particular quiz, permanently remove the quiz.
 *
 * @param {integer} token - unique indentifier for person logged in.
 * @param {integer} quizId - unique identifier for a quiz.
 * @returns {{ }} - empty object
 */
export function adminQuizRemove(token: string, quizId: number) {
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

  // second error - Quiz ID does not refer to a valid quiz
  const checkQuizId = data.quizzes.some((obj) => obj.quizId === quizId);

  if (!checkQuizId) {
    return {
      error: 'Quiz ID does not refer to a valid quiz',
    };
  }

  // third error - Quiz ID does not refer to a quiz that this user owns
  const tokenFound = data.tokens.find((obj) => obj.token === token);
  const authUserId = tokenFound.userId;
  const userQuiz = data.userQuiz.find(userQuiz => userQuiz.userId === authUserId && userQuiz.quizId === quizId);
  if (!userQuiz) {
    return { error: 'Quiz ID does not refer to a quiz that this user owns' };
  }

  const quizFound = data.quizzes.find(obj => obj.quizId === quizId);
  const userFound = data.tokens.find(obj => obj.token === token);
  const unixTimestamp = Math.floor(Date.now() / 1000);

  data.quizInTrash.push({
    quizId: quizId,
    name: quizFound.name,
    timeCreated: quizFound.timeCreated,
    timeLastEdited: unixTimestamp,
    description: quizFound.description,
    numQuestions: quizFound.numQuestions,
    questions: quizFound.questions,
    userId: userFound.userId,
    duration: quizFound.duration
  });

  // Section of deleting the quizzes
  for (let i = data.quizzes.length - 1; i >= 0; i--) {
    if (data.quizzes[i].quizId === quizId) {
      data.quizzes.splice(i, 1);
    }
  }

  for (let i = data.userQuiz.length - 1; i >= 0; i--) {
    if (data.userQuiz[i].quizId === quizId && data.userQuiz[i].userId === userFound.userId) {
      data.userQuiz.splice(i, 1);
    }
  }
  // The timeLastEdited is updated in adminQuizRemove
  setData(data);

  return { };
}

/**
 * Provided authentication token and a quiz id
 *
 * returns a object containing related data of it
 *
 * @param {integer} token - unique identifier for token.
 * @param {integer} quizId - unique identifier for quiz.
 * @returns {{quizId: number, name: string, timeCreated: number,timeLastEdited: number, description: string}}} - data object
 */
export function adminQuizInfo(token: string, quizId: number) {
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
  const authUserId = tokenFound.userId;

  const checkQuizId = data.quizzes.some(
    (obj) => obj.quizId === quizId
  );

  if (!checkQuizId) {
    return {
      error: 'Quiz ID does not refer to a valid quiz',
    };
  }

  const quizData = data.quizzes.find(quiz => quiz.quizId === quizId);

  const owner = data.userQuiz.some(user => user.userId === authUserId && user.quizId === quizId);

  if (!owner) {
    return { error: 'Quiz ID does not refer to a quiz that this user owns' };
  }

  setData(data);
  return {
    quizId: quizId,
    name: quizData.name,
    timeCreated: quizData.timeCreated,
    timeLastEdited: quizData.timeLastEdited,
    description: quizData.description,
    numQuestions: quizData.questions.length,
    questions: quizData.questions,
    duration: quizData.duration,
  };
}

/**
 * Provided authentication token, quiz id and quiz name
 *
 * returns an empty object
 *
 * @param {integer} token - unique identifier for token.
 * @param {integer} quizId - unique identifier for quiz.
 * @param {string} name - user name.
 * @returns {{}}} - empty object
 */
export function adminQuizNameUpdate(token: string, quizId: number, name: string) {
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
  const authUserId = tokenFound.userId;

  const checkQuizId = data.quizzes.some(
    (obj) => obj.quizId === quizId
  );

  if (!checkQuizId) {
    return {
      error: 'Quiz ID does not refer to a valid quiz',
    };
  }

  // Check if quizId refers to a quiz that this user owns
  const userQuiz = data.userQuiz.find(userQuiz => userQuiz.userId === authUserId && userQuiz.quizId === quizId);
  if (!userQuiz) {
    return { error: 'Quiz ID does not refer to a quiz that this user owns' };
  }

  // Check if name contains any characters that are not alphanumeric or are spaces
  if (!/^[a-z0-9 ]+$/i.test(name)) {
    return { error: 'Name contains invalid characters. Valid characters are alphanumeric and spaces' };
  }

  // Check if name is either less than 3 characters long or more than 30 characters long
  if (name.length < 3 || name.length > 30) {
    return { error: 'Name is either less than 3 characters long or more than 30 characters long' };
  }

  // Check if name is already used by the current logged in user for another quiz
  const userQuizzes = data.userQuiz.filter(userQuiz => userQuiz.userId === authUserId);
  for (const userQuiz of userQuizzes) {
    const userQuizName = data.quizzes.find(quiz => quiz.quizId === userQuiz.quizId).name;
    if (userQuizName === name) {
      return { error: 'Name is already used by the current logged in user for another quiz' };
    }
  }

  // If no errors, update the name of the quiz
  const quizIndex = data.quizzes.findIndex(q => q.quizId === quizId);
  data.quizzes[quizIndex].name = name;

  // Update the data
  setData(data);

  return {};
}

/**
 * Provide authentication token, quizId and new description
 *
 * Updating the description of the relevant quiz.
 *
 *@param {integer} token - unique identifier for logged for token.
 *@param {integer} quizId - unique identifier for quiz.
 *@param {string} description - description of the quiz.
 *@return {{}} - empty object
 */
export function adminQuizDescriptionUpdate(quizId: number, token: string, description: string) {
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
  if (description.length > 100) {
    return { error: 'Description is more than 100 characters in length (note: empty strings are OK)' };
  }
  const checkQuizId = data.quizzes.some((obj) => obj.quizId === quizId);
  if (!checkQuizId) {
    return {
      error: 'Quiz ID does not refer to a valid quiz',
    };
  }
  let userId;
  for (const single of data.tokens) {
    if (single.token === token) {
      userId = single.userId;
    }
  }
  for (const quiz of data.userQuiz) {
    if (quiz.quizId === quizId) {
      if (quiz.userId !== userId) {
        return { error: 'Quiz ID does not refer to a quiz that this user owns' };
      }
    }
  }
  const quizIndex = data.quizzes.findIndex(q => q.quizId === quizId);
  data.quizzes[quizIndex].description = description;
  setData(data);

  return {};
}

// ====================================================================
// ========================= iter2 (New) ==============================
// ====================================================================

/**
 * View the quizzes that are currently in the trash for the logged in user.
 *
 * Return quizId and quizId
 *
 *@param {integer} token - unique identifier for logged in user.
 *@return {{}} - empty object
 */
export function adminQuizTrashView(token: string) {
  const data = getData();
  // Checking if token is valid
  if (!token || typeof token !== 'string') {
    return { error: 'Token is not a valid structure' };
  }
  // Checking if token is currently logged in
  const checkToken = data.tokens.find((obj) => obj.token === token);
  if (!checkToken) {
    return { error: 'Provided token is valid structure, but is not for a currently logged in session' };
  }
  // Return quizId and name stored in trash
  const trashView = data.quizInTrash.filter((userTrash) => userTrash.userId === checkToken.userId).map(({ quizId, name }) => ({ quizId, name }));
  setData(data);
  return {
    quizzes: trashView,
  };
}

/**
 * Restore a particular quiz from the trash back to an active quiz
 *
 * Return empty obejct
 *
 *@param {integer} token - unique identifier for logged for token.
 *@param {integer} quizId - unique identifier for quiz.
 *@return {{}} - empty object
 */
export function adminQuizRestore(quizId: number, token: string) {
  const data = getData();

  // Checking if token is a valid structure

  if (!token || typeof token !== 'string') {
    return { error: 'Token is not a valid structure' };
  }

  // Checking if token exists and logged in session

  const checkToken = data.tokens.some((obj) => obj.token === token);

  if (!checkToken) {
    return { error: 'Provided token is valid structure, but is not for a currently logged in session' };
  }

  // Checking if quizId is a valid quiz

  const checkQuizId = data.quizInTrash.some(
    (obj) => obj.quizId === quizId
  );

  if (!checkQuizId) {
    return { error: 'Quiz ID does not refer to a valid quiz' };
  }

  // Checking if user owns the quiz

  const tokenFound = data.tokens.find((obj) => obj.token === token);
  const userOwnQuiz = data.quizInTrash.find((obj) => obj.quizId === quizId && obj.userId === tokenFound.userId);
  if (!userOwnQuiz) {
    return { error: 'Quiz ID does not refer to a quiz that this user owns' };
  }

  // Checking if quiz is not in the trash

  const quizTrash = data.quizInTrash.find((quiz) => quiz.quizId === quizId);

  if (!quizTrash) {
    return { error: 'Quiz ID refers to a quiz that is not currently in the trash' };
  }

  // Deleting quiz from quizInTrash and making sure that it is pushed to quiz array

  const quizIndex = data.quizInTrash.findIndex((quiz) => quiz.quizId === quizId);
  if (quizIndex !== -1) {
    const restoredQuiz = data.quizInTrash.splice(quizIndex, 1)[0];
    data.quizzes.push(restoredQuiz);
    data.userQuiz.push({
      userId: restoredQuiz.userId,
      quizId: restoredQuiz.quizId,
    });
  }
  setData(data);
  return {};
}

/**
 * Permanently delete specific quizzes currently sitting in the trash
 *
 * Return empty obejct
 *
 *@param {integer} token - unique identifier for logged for token.
 *@param {number[]} quizIds - array of quizId that need to be deleted
 *@return {{}} - empty object
 */
export function adminQuizTrashEmpty(token: string, quizIds: number[]) {
  const data = getData();
  // Checking if token is valid
  if (!token || typeof token !== 'string') {
    return {
      error: 'Token is not a valid structure'
    };
  }
  // Checking if token is currently logged in
  const checkToken = data.tokens.find((obj) => obj.token === token);
  if (!checkToken) {
    return {
      error: 'Provided token is valid structure, but is not for a currently logged in session'
    };
  }
  // Checking if quizId is valid
  const checkQuizId = quizIds.filter((id) => !data.quizzes.some((quiz) => quiz.quizId === id) && !data.quizInTrash.some((quiz) => quiz.quizId === id));
  if (checkQuizId.length > 0) {
    return {
      error: 'One or more of the Quiz IDs is not a valid quiz'
    };
  }
  // Checking if the user owns quizIds
  const userOwnsQuiz = data.quizInTrash.find((obj) => obj.userId === checkToken.userId &&
    quizIds.includes(obj.quizId));
  if (!userOwnsQuiz) {
    return {
      error: 'One or more of the Quiz IDs refers to a quiz that this current user does not own'
    };
  }
  // One or more of the Quiz IDs is not currently in the trash
  const checkQuizInTrash = quizIds.filter((id) => !data.quizInTrash.some((quiz) => quiz.quizId === id) && data.quizzes.find((quiz) => quiz.quizId === id));
  if (checkQuizInTrash.length > 0) {
    return {
      error: 'One or more of the Quiz IDs is not currently in the trash'
    };
  }
  // Deleting and updating dataStore
  data.quizInTrash = data.quizInTrash.filter((obj) => !quizIds.includes(obj.quizId));
  setData(data);

  return {};
}

/**
 * Transfer ownership of a quiz to a different user based on their email
 *
 * returns an empty object
 *
 * @param {string} userEmail - user email
 * @param {integer} token - user token
 * @param {integer} quizId - quiz id
 * @returns {}
 */
export function adminQuizTransfer(quizid: number, token: string, userEmail: string) {
  const data = getData();
  const userid = data.tokens.filter(obj => obj.token === token)[0]?.userId;
  // Checking for Token is not a valid structure
  if (!token || typeof token !== 'string') {
    return {
      error: 'Token is not a valid structure'
    };
  }
  // Checking for token is valid structure, but is not for a currently logged in session
  const checkToken = data.tokens.some((obj) => obj.token === token);
  if (!checkToken) {
    return {
      error: 'Provided token is valid structure, but is not for a currently logged in session',
    };
  }
  // Checking for Quiz ID does not refer to a valid quiz
  if (!data.quizzes.some(obj => obj.quizId === quizid)) {
    return { error: 'Quiz ID does not refer to a valid quiz' };
  }
  // Checking for Quiz ID does not refer to a quiz that this user owns
  if (!data.userQuiz.some(obj => obj.quizId === quizid && obj.userId === userid)) {
    return {
      error: 'Quiz ID does not refer to a quiz that this user owns'
    };
  }
  // Checking for userEmail is not a real user
  if (!data.users.some(obj => obj.email === userEmail)) {
    return {
      error: 'userEmail is not a real user'
    };
  }
  // Checking for userEmail is the current logged in user
  const user = data.users.filter(obj => obj.email === userEmail);
  if (data.userQuiz.some(obj => obj.quizId === quizid && obj.userId === user[0].userId)) {
    return {
      error: 'userEmail is the current logged in user'
    };
  }
  // Checking if All sessions for this quiz must be in END state
  const quizStateCheck = data.quizSessions.filter((session) => session.quiz.quizId === quizid && session.state !== States.END);
  if (quizStateCheck.length > 0) {
    return {
      error: 'All sessions for this quiz must be in END state',
    };
  }
  // Checking for Quiz ID refers to a quiz that has a name that is already used by the target user
  const quizName = data.quizzes.filter(obj => obj.quizId === quizid)[0]?.name;
  const userid1 = data.users.filter(obj => obj.email === userEmail)[0]?.userId;
  const userQuizzes = data.userQuiz.filter(obj => obj.userId === userid1);
  for (let i = 0; i < userQuizzes.length; i++) {
    for (let j = 0; j < data.quizzes.length; j++) {
      if (userQuizzes[i].quizId === data.quizzes[j].quizId) {
        if (data.quizzes[j].name === quizName) {
          return { error: 'Quiz ID refers to a quiz that has a name that is already used by the target user' };
        }
        continue;
      }
    }
  }
  const [receiver] = data.users.filter(obj => obj.email === userEmail);
  data.userQuiz.forEach(obj => {
    if (obj.quizId === quizid && obj.userId === userid) {
      obj.userId = receiver.userId;
    }
  }
  );
  setData(data);
  return {};
}

/**
 * Create a new stub question for a particular quiz.
 *
 * returns questionId
 *
 * @param {string} token - unique identifier for token.
 * @param {integer} quizId - unique identifier for quiz.
 * @param {object} questionBody - question info
 * @returns {integer}} - questionId
 */
export function adminQuizQuestionCreate(quizId: number, token: string, questionBody: {question: string, duration: number, points: number, answers: {answer: string, correct: boolean}[]}) {
  const data = getData();
  // Checking if token has valid structure
  if (!token || typeof token !== 'string') {
    return {
      error: 'Token is not a valid structure'
    };
  }
  // Checking if token is valid but not for a currently logged in session
  const checkToken = data.tokens.some((obj) => obj.token === token);
  if (!checkToken) {
    return {
      error: 'Provided token is valid structure, but is not for a currently logged in session'
    };
  }
  // Checking if quizId is valid
  const checkQuizId = data.quizzes.some((obj) => obj.quizId === quizId);
  if (!checkQuizId) {
    return {
      error: 'Quiz ID does not refer to a valid quiz'
    };
  }
  // Checking if user owns this quiz
  const tokenFound = data.tokens.find((obj) => obj.token === token);
  const authUserId = tokenFound.userId;
  const userQuiz = data.userQuiz.find(userQuiz => userQuiz.userId === authUserId && userQuiz.quizId === quizId);
  if (!userQuiz) {
    return { error: 'Quiz ID does not refer to a quiz that this user owns' };
  }
  // Checking if question string is valid
  if (questionBody.question.length < 5 || questionBody.question.length > 50) {
    return {
      error: 'Question string is less than 5 characters in length or greater than 50 characters in length'
    };
  }
  // Checking if num of answers in question is valid
  if (questionBody.answers.length < 2 || questionBody.answers.length > 6) {
    return {
      error: 'The question has more than 6 answers or less than 2 answers'
    };
  }
  // Checking if question duration valid
  if (questionBody.duration <= 0) {
    return {
      error: 'The question duration is not a positive number'
    };
  }

  // Checking if sum of duration is valid
  const quizIndex = data.quizzes.findIndex((quiz) => quiz.quizId === quizId);
  const durationBeforeCreate = data.quizzes[quizIndex].duration;
  const durationAfterCreate = durationBeforeCreate + questionBody.duration;
  if (durationAfterCreate > 180) {
    return {
      error: 'The sum of the question durations in the quiz exceeds 3 minutes'
    };
  }
  // Checking if points to question is valid
  if (questionBody.points > 10 || questionBody.points < 1) {
    return {
      error: 'The points awarded for the question are less than 1 or greater than 10'
    };
  }
  // Checking if length of answers valid
  if (questionBody.answers.some(obj => obj.answer.length < 1 || obj.answer.length > 30)) {
    return {
      error: 'The length of any answer is shorter than 1 character long, or longer than 30 characters long'
    };
  }
  // Checking if there are same answers
  if (questionBody.answers.some((answer, i) => questionBody.answers.findIndex(a => a.answer === answer.answer) !== i)) {
    return {
      error: 'Any answer strings are duplicates of one another (within the same question)'
    };
  }
  // Checking if there are no correct answers
  if (!questionBody.answers.some(answer => answer.correct)) {
    return {
      error: 'There are no correct answers'
    };
  }
  // Creating questions for quiz
  const question: Question = {
    questionId: generateRandomNumber(),
    question: questionBody.question,
    duration: questionBody.duration,
    points: questionBody.points,
    answers: questionBody.answers.map(answer => ({
      answerId: generateRandomNumber(),
      answer: answer.answer,
      colour: generateRandomColour(),
      correct: answer.correct
    }))
  };
  data.quizzes[quizIndex].timeLastEdited = Date.now();
  data.quizzes[quizIndex].questions.push(question);
  const questionFound = data.quizzes.find((obj) => obj.quizId === quizId);
  data.quizzes[quizIndex].numQuestions = questionFound.questions.length;
  data.quizzes[quizIndex].duration = durationAfterCreate;
  setData(data);
  return {
    questionId: question.questionId,
  };
}

/**
 * Update the relevant details of a particular question within a quiz.
 *
 * returns empty object
 *
 * @param {string} token - unique identifier for token.
 * @param {integer} quizId - unique identifier for quiz.
 * @param {object} questionBody - question info
 * @returns {{}}} - empty object
 */
export function adminQuizQuestionUpdate(quizId: number, questionId: number, token: string, questionBody: {question: string, duration: number, points: number, answers: {answer: string, correct: boolean}[]}) {
  const data = getData();
  // Checking if token has valid structure
  if (!token || typeof token !== 'string') {
    return {
      error: 'Token is not a valid structure'
    };
  }

  // Checking if token is valid but not for a currently logged in session
  const checkToken = data.tokens.some((obj) => obj.token === token);
  if (!checkToken) {
    return {
      error: 'Provided token is valid structure, but is not for a currently logged in session'
    };
  }

  // Checking if quizId is valid
  const checkQuizId = data.quizzes.some((obj) => obj.quizId === quizId);
  if (!checkQuizId) {
    return {
      error: 'Quiz ID does not refer to a valid quiz'
    };
  }

  // Checking if user owns this quiz
  const tokenFound = data.tokens.find((obj) => obj.token === token);
  const authUserId = tokenFound.userId;
  const userQuiz = data.userQuiz.find(userQuiz => userQuiz.userId === authUserId && userQuiz.quizId === quizId);
  if (!userQuiz) {
    return { error: 'Quiz ID does not refer to a quiz that this user owns' };
  }

  // Checking if question string is valid
  if (questionBody.question.length < 5 || questionBody.question.length > 50) {
    return {
      error: 'Question string is less than 5 characters in length or greater than 50 characters in length'
    };
  }

  // Checking if num of answers in question is valid
  if (questionBody.answers.length < 2 || questionBody.answers.length > 6) {
    return {
      error: 'The question has more than 6 answers or less than 2 answers'
    };
  }

  // Checking if question duration valid
  if (questionBody.duration <= 0) {
    return {
      error: 'The question duration is not a positive number'
    };
  }

  // Checking if sum of duration is valid
  const quizFound = data.quizzes.find((obj) => obj.quizId === quizId);
  const duration = quizFound.duration + questionBody.duration;
  if (duration / 60 > 3) {
    return {
      error: 'If this question were to be updated, the sum of the question durations in the quiz exceeds 3 minutes'
    };
  }

  // Checking if points to question is valid
  if (questionBody.points > 10 || questionBody.points < 1) {
    return {
      error: 'The points awarded for the question are less than 1 or greater than 10'
    };
  }

  // Checking if length of answers valid
  if (questionBody.answers.some(obj => obj.answer.length < 1 || obj.answer.length > 30)) {
    return {
      error: 'The length of any answer is shorter than 1 character long, or longer than 30 characters long'
    };
  }

  // Checking if there are same answers
  if (questionBody.answers.some((answer, i) => questionBody.answers.findIndex(a => a.answer === answer.answer) !== i)) {
    return {
      error: 'Any answer strings are duplicates of one another (within the same question)'
    };
  }

  // Checking if there are no correct answers
  if (!questionBody.answers.some(answer => answer.correct)) {
    return {
      error: 'There are no correct answers'
    };
  }

  const quizIndex = data.quizzes.findIndex((quiz) => quiz.quizId === quizId);
  const questionIndex = data.quizzes[quizIndex].questions.findIndex((question) => question.questionId === questionId);
  if (questionIndex === -1) {
    return {
      error: 'Question Id does not refer to a valid question within this quiz'
    };
  }
  const updatedQuestion: Question = {
    questionId: questionId,
    question: questionBody.question,
    duration: questionBody.duration,
    points: questionBody.points,
    answers: questionBody.answers.map(answer => ({
      answerId: generateRandomNumber(),
      answer: answer.answer,
      colour: generateRandomColour(),
      correct: answer.correct
    }))
  };
  data.quizzes[quizIndex].questions[questionIndex] = updatedQuestion;
  data.quizzes[quizIndex].timeLastEdited = Date.now();
  const totalDuration = data.quizzes[quizIndex].questions.reduce((sum, question) => sum + question.duration, 0);
  data.quizzes[quizIndex].duration = totalDuration;

  setData(data);
  return {};
}

/**
 * Delete a particular question from a quiz
 *
 * returns empty object
 *
 * @param {string} token - unique identifier for token.
 * @param {integer} quizId - unique identifier for quiz.
 * @param {object} questionId - unique identifier for question
 * @returns {{}}} - empty object
 */
export function adminQuizQuestionRemove(quizId: number, questionId: number, token: string) {
  const data = getData();
  // Checking if Token is not a valid structure
  if (!token || typeof token !== 'string') {
    return {
      error: 'Token is not a valid structure',
    };
  }
  // Checking if Provided token is valid structure, but is not for a currently logged in session
  const tokenFound = data.tokens.find((user) => user.token === token);
  if (!tokenFound) {
    return {
      error: 'Provided token is valid structure, but is not for a currently logged in session',
    };
  }
  // Checking if Quiz ID does not refer to a valid quiz
  const quizFound = data.quizzes.find((obj) => obj.quizId === quizId);
  if (!quizFound) {
    return {
      error: 'Quiz ID does not refer to a valid quiz',
    };
  }
  // Checking if Quiz ID does not refer to a quiz that this user owns
  const userQuiz = data.userQuiz.find(userQuiz => userQuiz.userId === tokenFound.userId && userQuiz.quizId === quizId);
  if (!userQuiz) {
    throw HTTPError(400, 'Quiz ID does not refer to a quiz that this user owns');
  }
  // Checking if Question Id does not refer to a valid question within this quiz
  const questionFound = quizFound.questions.find((question) => question.questionId === questionId);
  if (!questionFound) {
    return {
      error: 'Question Id does not refer to a valid question within this quiz',
    };
  }
  // Checking if All sessions for this quiz must be in END state
  const quizStateCheck = data.quizSessions.filter((session) => session.quiz.quizId === quizId && session.state !== States.END);
  if (quizStateCheck.length > 0) {
    return {
      error: 'All sessions for this quiz must be in END state',
    };
  }
  const questionIndex = quizFound.questions.findIndex((question) => question.questionId === questionId);
  quizFound.questions.splice(questionIndex, 1);
  setData(data);
  return {};
}

/**
 * Provided authentication token, quiz id and question id and position to move quiz question
 *
 * returns an empty object
 *
 * @param {string} token - unique identifier for token.
 * @param {integer} quizId - unique identifier for quiz.
 * @param {integer} questionId - unique identifier for quiz.
 * @param {integer} newPosition - user name.
 * @returns {{}}} - empty object
 */
export function adminQuizQuestionMove(quizId: number, questionId: number, token: string, newPosition: number) {
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
  const authUserId = tokenFound.userId;
  const quiz = data.quizzes.find(q => q.quizId === quizId);
  if (!quiz) {
    return {
      error: 'Quiz ID does not refer to a valid quiz',
    };
  }
  // Check if quizId refers to a quiz that this user owns
  const userQuiz = data.userQuiz.find(userQuiz => userQuiz.userId === authUserId && userQuiz.quizId === quizId);
  if (!userQuiz) {
    return { error: 'Quiz ID does not refer to a quiz that this user owns' };
  }
  const questionIndex = quiz.questions.findIndex(q => q.questionId === questionId);
  if (questionIndex === -1) {
    return { error: 'Question Id does not refer to a valid question within this quiz' };
  }
  if (newPosition < 0 || newPosition >= quiz.questions.length) {
    return { error: 'NewPosition is less than 0, or NewPosition is greater than n-1 where n is the number of questions' };
  }
  if (newPosition === questionIndex) {
    return { error: 'NewPosition is the position of the current question' };
  }
  const question = quiz.questions.splice(questionIndex, 1)[0];
  quiz.questions.splice(newPosition, 0, question);
  quiz.timeLastEdited = Date.now();
  setData(data);
  return {};
}

/**
 * Provided authentication token, quiz id and question id and duplicate quiz question
 *
 * returns an empty object
 *
 * @param {string} token - unique identifier for token.
 * @param {integer} quizId - unique identifier for quiz.
 * @param {integer} questionId - unique identifier for quiz.
 * @returns {newQuestionId: number} - return new question Id.
 */
export function adminQuizQuestionDuplicate(token: string, quizId: number, questionId: number) {
  const data = getData();
  // Checking if Token is not a valid structure
  if (!token || typeof token !== 'string') {
    return {
      error: 'Token is not a valid structure',
    };
  }
  // Checking if Provided token is valid structure, but is not for a currently logged in session
  const tokenFound = data.tokens.find((user) => user.token === token);
  if (!tokenFound) {
    return {
      error: 'Provided token is valid structure, but is not for a currently logged in session',
    };
  }
  // Checking if Quiz ID does not refer to a valid quiz
  const quizFound = data.quizzes.find((obj) => obj.quizId === quizId);
  if (!quizFound) {
    return {
      error: 'Quiz ID does not refer to a valid quiz',
    };
  }
  // Checking if Quiz ID does not refer to a quiz that this user owns
  const userQuiz = data.userQuiz.find(userQuiz => userQuiz.userId === tokenFound.userId && userQuiz.quizId === quizId);
  if (!userQuiz) {
    throw HTTPError(400, 'Quiz ID does not refer to a quiz that this user owns');
  }
  // Checking if Question Id does not refer to a valid question within this quiz
  const questionFound = quizFound.questions.find((question) => question.questionId === questionId);
  if (!questionFound) {
    return {
      error: 'Question Id does not refer to a valid question within this quiz',
    };
  }
  const questionIndex = quizFound.questions.findIndex((question) => question.questionId === questionId);
  const newQuestionId = generateRandomNumber();
  const question = { ...quizFound.questions[questionIndex], questionId: newQuestionId };
  quizFound.questions.splice(questionIndex + 1, 0, question);
  quizFound.timeLastEdited = Date.now();
  setData(data);
  return {
    questionId: newQuestionId,
  };
}

// ====================================================================
// ========================= iter3 (Modified) =========================
// ====================================================================

/**
 * Provide a list of all quizzes that are owned by the currently
 * logged in users.
 *
 * @param {integer} authUserId - unique identifier for admin users.
 * @returns {{quizzes: {quizId: integer, name: string}}}
 */
export function adminQuizListV2(token: string) {
  const data = getData();
  // Checking if Token is not a valid structure
  if (!token || typeof token !== 'string') {
    throw HTTPError(401, 'Token is not a valid structure');
  }
  // Checking if Provided token is valid structure, but is not for a currently logged in session
  const checkToken = data.tokens.some((obj) => obj.token === token);
  if (!checkToken) {
    throw HTTPError(403, 'Provided token is valid structure, but is not for a currently logged in session');
  }
  const tokenFound = data.tokens.find((obj) => obj.token === token);
  const userHaveQuiz = data.userQuiz.filter((obj) => obj.userId === tokenFound.userId);
  const quizzes = userHaveQuiz.map((userQuiz) => {
    const { quizId } = userQuiz;
    const quizinfo = data.quizzes.find((obj) => obj.quizId === quizId);
    return { quizId, name: quizinfo.name };
  });
  setData(data);
  return { quizzes };
}

/**
 * Given basic details about a new quiz, create one for the logged in user.
 * return quizId.
 *
 * @param {integer} token - unique identifier for token.
 * @param {string} name - name of the new quiz
 * @param {string} description - description of the new quiz
 * @returns {{quizId: integer}}
 */
export function adminQuizCreateV2(token: string, name: string, description: string) {
  const data = getData();
  // Checking if Token is not a valid structure
  if (!token || typeof token !== 'string') {
    throw HTTPError(401, 'Token is not a valid structure');
  }
  // Checking if Provided token is valid structure, but is not for a currently logged in session
  const checkToken = data.tokens.some((obj) => obj.token === token);
  if (!checkToken) {
    throw HTTPError(403, 'Provided token is valid structure, but is not for a currently logged in session');
  }
  // Checking if Name contains invalid characters. Valid characters are alphanumeric and spaces
  if (!/^[0-9a-zA-Z\s]+$/.test(name)) {
    throw HTTPError(400, 'Name contains invalid characters. Valid characters are alphanumeric and spaces');
  }
  // Checking if Name is either less than 3 characters long or more than 30 characters long
  if (name.length < 3 || name.length > 30) {
    throw HTTPError(400, 'Name is either less than 3 characters long or more than 30 characters long');
  }
  // Checking if Name is already used by the current logged in user for another quiz
  const tokenFound = data.tokens.find((user) => user.token === token);
  const quizFound = data.userQuiz.filter((quiz) => quiz.userId === tokenFound.userId).map((userQuiz) => userQuiz.quizId);
  const nameUsed = data.quizzes.some((quiz) => quizFound.includes(quiz.quizId) && quiz.name === name);
  if (nameUsed) {
    throw HTTPError(400, 'Name is already used by the current logged in user for another quiz');
  }
  // Checking if Description is more than 100 characters in length (note: empty strings are OK)
  if (description.length > 100) {
    throw HTTPError(400, 'Description is more than 100 characters in length (note: empty strings are OK)');
  }
  const unixTimestamp = Math.floor(Date.now() / 1000);
  // Checking if userId already exist in dataStore
  let quizId1;
  if (data.quizzes.length === 0) {
    quizId1 = 1;
  } else {
    const i = data.quizzes.length - 1;
    quizId1 = data.quizzes[i].quizId + 1;
  }
  data.quizzes.push({
    quizId: quizId1,
    name: name,
    timeCreated: unixTimestamp,
    timeLastEdited: unixTimestamp,
    description: description,
    numQuestions: 0,
    questions: [],
    duration: 0,
    thumbnailUrl: '',
  });
  const findToken = data.tokens.find((user) => user.token === token);
  data.userQuiz.push({
    userId: findToken.userId,
    quizId: quizId1,
  });
  setData(data);
  return {
    quizId: quizId1,
  };
}

/**
 * Given a particular quiz, permanently remove the quiz.
 *
 * @param {integer} token - unique indentifier for person logged in.
 * @param {integer} quizId - unique identifier for a quiz.
 * @returns {{ }} - empty object
 */
export function adminQuizRemoveV2(token: string, quizId: number) {
  const data = getData();
  // Checking if Token is not a valid structure
  if (!token || typeof token !== 'string') {
    throw HTTPError(401, 'Token is not a valid structure');
  }
  // Checking if Provided token is valid structure, but is not for a currently logged in session
  const checkToken = data.tokens.some((obj) => obj.token === token);
  if (!checkToken) {
    throw HTTPError(403, 'Provided token is valid structure, but is not for a currently logged in session');
  }
  // Checking if Quiz ID does not refer to a valid quiz
  const checkQuizId = data.quizzes.some((obj) => obj.quizId === quizId);
  if (!checkQuizId) {
    throw HTTPError(400, 'Quiz ID does not refer to a valid quiz');
  }
  // Checking if Quiz ID does not refer to a quiz that this user owns
  const tokenFound = data.tokens.find((obj) => obj.token === token);
  const userQuiz = data.userQuiz.find(userQuiz => userQuiz.userId === tokenFound.userId && userQuiz.quizId === quizId);
  if (!userQuiz) {
    throw HTTPError(400, 'Quiz ID does not refer to a quiz that this user owns');
  }
  // Checking if All sessions for this quiz must be in END state
  const quizStateCheck = data.quizSessions.filter((session) => session.quiz.quizId === quizId && session.state !== States.END);
  if (quizStateCheck.length > 0) {
    throw HTTPError(400, 'All sessions for this quiz must be in END state');
  }
  const quizFound = data.quizzes.find(obj => obj.quizId === quizId);
  const userFound = data.tokens.find(obj => obj.token === token);
  const unixTimestamp = Math.floor(Date.now() / 1000);
  data.quizInTrash.push({
    quizId: quizId,
    name: quizFound.name,
    timeCreated: quizFound.timeCreated,
    timeLastEdited: unixTimestamp,
    description: quizFound.description,
    numQuestions: quizFound.numQuestions,
    questions: quizFound.questions,
    userId: userFound.userId,
    duration: quizFound.duration,
    thumbnailUrl: quizFound.thumbnailUrl,
  });
  // Section of deleting the quizzes
  for (let i = data.quizzes.length - 1; i >= 0; i--) {
    if (data.quizzes[i].quizId === quizId) {
      data.quizzes.splice(i, 1);
    }
  }
  for (let i = data.userQuiz.length - 1; i >= 0; i--) {
    if (data.userQuiz[i].quizId === quizId && data.userQuiz[i].userId === userFound.userId) {
      data.userQuiz.splice(i, 1);
    }
  }
  setData(data);
  return { };
}

/**
 * Provided authentication token and a quiz id
 *
 * returns a object containing related data of it
 *
 * @param {integer} token - unique identifier for token.
 * @param {integer} quizId - unique identifier for quiz.
 * @returns {{quizId: number, name: string, timeCreated: number,timeLastEdited: number, description: string}}} - data object
 */
export function adminQuizInfoV2(token: string, quizId: number) {
  const data = getData();
  // Checking if Token is not a valid structure
  if (!token || typeof token !== 'string') {
    throw HTTPError(401, 'Token is not a valid structure');
  }
  // Checking if Provided token is valid structure, but is not for a currently logged in session
  const checkToken = data.tokens.some((obj) => obj.token === token);
  if (!checkToken) {
    throw HTTPError(403, 'Provided token is valid structure, but is not for a currently logged in session');
  }
  // Checking if Quiz ID does not refer to a valid quiz
  const checkQuizId = data.quizzes.some((obj) => obj.quizId === quizId);
  if (!checkQuizId) {
    throw HTTPError(400, 'Quiz ID does not refer to a valid quiz');
  }
  // Checking if Quiz ID does not refer to a quiz that this user owns
  const tokenFound = data.tokens.find((obj) => obj.token === token);
  const userQuiz = data.userQuiz.find(userQuiz => userQuiz.userId === tokenFound.userId && userQuiz.quizId === quizId);
  if (!userQuiz) {
    throw HTTPError(400, 'Quiz ID does not refer to a quiz that this user owns');
  }
  const quizData = data.quizzes.find((quiz) => quiz.quizId === quizId);
  setData(data);
  return {
    quizId: quizId,
    name: quizData.name,
    timeCreated: quizData.timeCreated,
    timeLastEdited: quizData.timeLastEdited,
    description: quizData.description,
    numQuestions: quizData.questions.length,
    questions: quizData.questions,
    duration: quizData.duration,
    thumbnailUrl: quizData.thumbnailUrl,
  };
}

/**
 * Provided authentication token, quiz id and quiz name
 *
 * returns an empty object
 *
 * @param {integer} token - unique identifier for token.
 * @param {integer} quizId - unique identifier for quiz.
 * @param {string} name - user name.
 * @returns {{}}} - empty object
 */
export function adminQuizNameUpdateV2(token: string, quizId: number, name: string) {
  const data = getData();
  // Checking if Token is not a valid structure
  if (!token || typeof token !== 'string') {
    throw HTTPError(401, 'Token is not a valid structure');
  }
  // Checking if Provided token is valid structure, but is not for a currently logged in session
  const checkToken = data.tokens.some((obj) => obj.token === token);
  if (!checkToken) {
    throw HTTPError(403, 'Provided token is valid structure, but is not for a currently logged in session');
  }
  // Checking if Quiz ID does not refer to a valid quiz
  const checkQuizId = data.quizzes.some((obj) => obj.quizId === quizId);
  if (!checkQuizId) {
    throw HTTPError(400, 'Quiz ID does not refer to a valid quiz');
  }
  // Checking if Quiz ID does not refer to a quiz that this user owns
  const tokenFound = data.tokens.find((obj) => obj.token === token);
  const userQuiz = data.userQuiz.find(userQuiz => userQuiz.userId === tokenFound.userId && userQuiz.quizId === quizId);
  if (!userQuiz) {
    throw HTTPError(400, 'Quiz ID does not refer to a quiz that this user owns');
  }
  // Checking if Name contains invalid characters. Valid characters are alphanumeric and spaces
  if (!/^[a-z0-9 ]+$/i.test(name)) {
    throw HTTPError(400, 'Name contains invalid characters. Valid characters are alphanumeric and spaces');
  }
  // Checking if Name is either less than 3 characters long or more than 30 characters long
  if (name.length < 3 || name.length > 30) {
    throw HTTPError(400, 'Name is either less than 3 characters long or more than 30 characters long');
  }
  // Check if Name is already used by the current logged in user for another quiz
  const userQuizzes = data.userQuiz.filter(userQuiz => userQuiz.userId === tokenFound.userId);
  for (const userQuiz of userQuizzes) {
    const userQuizName = data.quizzes.find(quiz => quiz.quizId === userQuiz.quizId).name;
    if (userQuizName === name) {
      throw HTTPError(400, 'Name is already used by the current logged in user for another quiz');
    }
  }
  const quizIndex = data.quizzes.findIndex(q => q.quizId === quizId);
  data.quizzes[quizIndex].name = name;
  setData(data);
  return {};
}

/**
 * Provide authentication token, quizId and new description
 *
 * Updating the description of the relevant quiz.
 *
 *@param {integer} token - unique identifier for logged for token.
 *@param {integer} quizId - unique identifier for quiz.
 *@param {string} description - description of the quiz.
 *@return {{}} - empty object
 */
export function adminQuizDescriptionUpdateV2(quizId: number, token: string, description: string) {
  const data = getData();
  // Checking if Token is not a valid structure
  if (!token || typeof token !== 'string') {
    throw HTTPError(401, 'Token is not a valid structure');
  }
  // Checking if Provided token is valid structure, but is not for a currently logged in session
  const checkToken = data.tokens.find((obj) => obj.token === token);
  if (!checkToken) {
    throw HTTPError(403, 'Provided token is valid structure, but is not for a currently logged in session');
  }
  // Checking if Quiz ID does not refer to a valid quiz
  const checkQuizId = data.quizzes.some((obj) => obj.quizId === quizId);
  if (!checkQuizId) {
    throw HTTPError(400, 'Quiz ID does not refer to a valid quiz');
  }
  // Checking if Quiz ID does not refer to a quiz that this user owns
  const tokenFound = data.tokens.find((obj) => obj.token === token);
  const userQuiz = data.userQuiz.find(userQuiz => userQuiz.userId === tokenFound.userId && userQuiz.quizId === quizId);
  if (!userQuiz) {
    throw HTTPError(400, 'Quiz ID does not refer to a quiz that this user owns');
  }
  // Checking if Description is more than 100 characters in length (note: empty strings are OK)
  if (description.length > 100) {
    throw HTTPError(400, 'Description is more than 100 characters in length (note: empty strings are OK)');
  }
  const quizIndex = data.quizzes.findIndex(q => q.quizId === quizId);
  data.quizzes[quizIndex].description = description;
  setData(data);
  return {};
}

/**
 * View the quizzes that are currently in the trash for the logged in user.
 *
 * Return quizId and quizId
 *
 *@param {integer} token - unique identifier for logged in user.
 *@return {{}} - empty object
 */
export function adminQuizTrashViewV2(token: string) {
  const data = getData();
  // Checking if token is valid
  if (!token || typeof token !== 'string') {
    throw HTTPError(401, 'Token is not a valid structure');
  }
  // Checking if Provided token is valid structure, but is not for a currently logged in session
  const checkToken = data.tokens.find((obj) => obj.token === token);
  if (!checkToken) {
    throw HTTPError(403, 'Provided token is valid structure, but is not for a currently logged in session');
  }
  // Return quizId and name stored in trash
  const trashView = data.quizInTrash.filter((userTrash) => userTrash.userId === checkToken.userId).map(({ quizId, name }) => ({ quizId, name }));
  setData(data);
  return {
    quizzes: trashView,
  };
}

/**
 * Restore a particular quiz from the trash back to an active quiz
 *
 * Return empty obejct
 *
 *@param {integer} token - unique identifier for logged for token.
 *@param {integer} quizId - unique identifier for quiz.
 *@return {{}} - empty object
 */
export function adminQuizRestoreV2(quizId: number, token: string) {
  const data = getData();
  // Checking if token is valid
  if (!token || typeof token !== 'string') {
    throw HTTPError(401, 'Token is not a valid structure');
  }
  // Checking if Provided token is valid structure, but is not for a currently logged in session
  const checkToken = data.tokens.find((obj) => obj.token === token);
  if (!checkToken) {
    throw HTTPError(403, 'Provided token is valid structure, but is not for a currently logged in session');
  }
  // Checking if Quiz ID does not refer to a valid quiz
  const checkQuizId = data.quizInTrash.some((obj) => obj.quizId === quizId);
  if (!checkQuizId) {
    throw HTTPError(400, 'Quiz ID does not refer to a valid quiz');
  }
  // Checking if Quiz ID does not refer to a quiz that this user owns
  const tokenFound = data.tokens.find((obj) => obj.token === token);
  const userOwnQuiz = data.quizInTrash.find((obj) => obj.quizId === quizId && obj.userId === tokenFound.userId);
  if (!userOwnQuiz) {
    throw HTTPError(400, 'Quiz ID does not refer to a quiz that this user owns');
  }

  // Checking if Quiz ID refers to a quiz that is not currently in the trash
  const quizTrash = data.quizInTrash.find((obj) => obj.quizId === quizId);
  if (!quizTrash) {
    throw HTTPError(400, 'Quiz ID refers to a quiz that is not currently in the trash');
  }
  // Deleting quiz from quizInTrash and making sure that it is pushed to quiz array
  const quizIndex = data.quizInTrash.findIndex((quiz) => quiz.quizId === quizId);
  if (quizIndex !== -1) {
    const restoredQuiz = data.quizInTrash.splice(quizIndex, 1)[0];
    data.quizzes.push(restoredQuiz);
    data.userQuiz.push({
      userId: restoredQuiz.userId,
      quizId: restoredQuiz.quizId,
    });
  }
  setData(data);
  return {};
}

/**
 * Permanently delete specific quizzes currently sitting in the trash
 *
 * Return empty obejct
 *
 *@param {integer} token - unique identifier for logged for token.
 *@param {number[]} quizIds - array of quizId that need to be deleted
 *@return {{}} - empty object
 */
export function adminQuizTrashEmptyV2(token: string, quizIds: number[]) {
  const data = getData();
  // Checking if Token is not a valid structure
  if (!token || typeof token !== 'string') {
    throw HTTPError(401, 'Token is not a valid structure');
  }
  // Checking if Provided token is valid structure, but is not for a currently logged in session
  const checkToken = data.tokens.find((obj) => obj.token === token);
  if (!checkToken) {
    throw HTTPError(403, 'Provided token is valid structure, but is not for a currently logged in session');
  }
  // Checking if One or more of the Quiz IDs is not a valid quiz
  const checkQuizId = quizIds.filter((id) => !data.quizzes.some((quiz) => quiz.quizId === id) && !data.quizInTrash.some((quiz) => quiz.quizId === id));
  if (checkQuizId.length > 0) {
    throw HTTPError(400, 'One or more of the Quiz IDs is not a valid quiz');
  }
  // Checking if One or more of the Quiz IDs refers to a quiz that this current user does not own
  const userOwnsQuiz = data.quizInTrash.find((obj) => obj.userId === checkToken.userId &&
    quizIds.includes(obj.quizId));
  if (!userOwnsQuiz) {
    throw HTTPError(400, 'One or more of the Quiz IDs refers to a quiz that this current user does not own');
  }
  // Checking if One or more of the Quiz IDs is not currently in the trash
  const checkQuizInTrash = quizIds.filter((id) => !data.quizInTrash.some((quiz) => quiz.quizId === id) && data.quizzes.find((quiz) => quiz.quizId === id));
  if (checkQuizInTrash.length > 0) {
    throw HTTPError(400, 'One or more of the Quiz IDs is not currently in the trash');
  }
  // Deleting and updating dataStore
  data.quizInTrash = data.quizInTrash.filter((obj) => !quizIds.includes(obj.quizId));
  setData(data);
  return {};
}

/**
 * Transfer ownership of a quiz to a different user based on their email
 *
 * returns an empty object
 *
 * @param {string} userEmail - user email
 * @param {integer} token - user token
 * @param {integer} quizId - quiz id
 * @returns {}
 */
export function adminQuizTransferV2(quizid: number, token: string, userEmail: string) {
  const data = getData();
  const userid = data.tokens.filter(obj => obj.token === token)[0]?.userId;
  // Checking if Token is not a valid structure
  if (!token || typeof token !== 'string') {
    throw HTTPError(401, 'Token is not a valid structure');
  }
  // Checking if Provided token is valid structure, but is not for a currently logged in session
  const checkToken = data.tokens.find((obj) => obj.token === token);
  if (!checkToken) {
    throw HTTPError(403, 'Provided token is valid structure, but is not for a currently logged in session');
  }
  // Checking if Quiz ID does not refer to a valid quiz
  const checkQuizId = data.quizzes.some((obj) => obj.quizId === quizid);
  if (!checkQuizId) {
    throw HTTPError(400, 'Quiz ID does not refer to a valid quiz');
  }
  // Checking if Quiz ID does not refer to a quiz that this user owns
  const tokenFound = data.tokens.find((obj) => obj.token === token);
  const userQuiz = data.userQuiz.find(userQuiz => userQuiz.userId === tokenFound.userId && userQuiz.quizId === quizid);
  if (!userQuiz) {
    throw HTTPError(400, 'Quiz ID does not refer to a quiz that this user owns');
  }
  // Checking if userEmail is not a real user
  if (!data.users.some(obj => obj.email === userEmail)) {
    throw HTTPError(400, 'userEmail is not a real user');
  }
  // Checking for userEmail is the current logged in user
  const user = data.users.filter(obj => obj.email === userEmail);
  if (data.userQuiz.some(obj => obj.quizId === quizid && obj.userId === user[0].userId)) {
    throw HTTPError(400, 'userEmail is the current logged in user');
  }
  // Checking if All sessions for this quiz must be in END state
  const quizStateCheck = data.quizSessions.filter((session) => session.quiz.quizId === quizid && session.state !== States.END);
  if (quizStateCheck.length > 0) {
    throw HTTPError(400, 'All sessions for this quiz must be in END state');
  }
  // Checking for Quiz ID refers to a quiz that has a name that is already used by the target user
  const quizName = data.quizzes.filter(obj => obj.quizId === quizid)[0]?.name;
  const userid1 = data.users.filter(obj => obj.email === userEmail)[0]?.userId;
  const userQuizzes = data.userQuiz.filter(obj => obj.userId === userid1);
  for (let i = 0; i < userQuizzes.length; i++) {
    for (let j = 0; j < data.quizzes.length; j++) {
      if (userQuizzes[i].quizId === data.quizzes[j].quizId) {
        if (data.quizzes[j].name === quizName) {
          throw HTTPError(400, 'Quiz ID refers to a quiz that has a name that is already used by the target user');
        }
        continue;
      }
    }
  }
  const [receiver] = data.users.filter(obj => obj.email === userEmail);
  data.userQuiz.forEach(obj => {
    if (obj.quizId === quizid && obj.userId === userid) {
      obj.userId = receiver.userId;
    }
  }
  );
  setData(data);
  return {};
}

/**
 * Create a new stub question for a particular quiz.
 *
 * returns questionId
 *
 * @param {string} token - unique identifier for token.
 * @param {integer} quizId - unique identifier for quiz.
 * @param {object} questionBody - question info
 * @returns {integer}} - questionId
 */
export function adminQuizQuestionCreateV2(quizId: number, token: string, questionBody: {question: string, duration: number, points: number, answers: {answer: string, correct: boolean}[], thumbnailUrl: string}) {
  const data = getData();
  // Checking if Token is not a valid structure
  if (!token || typeof token !== 'string') {
    throw HTTPError(401, 'Token is not a valid structure');
  }
  // Checking if Provided token is valid structure, but is not for a currently logged in session
  const checkToken = data.tokens.find((obj) => obj.token === token);
  if (!checkToken) {
    throw HTTPError(403, 'Provided token is valid structure, but is not for a currently logged in session');
  }
  // Checking if Quiz ID does not refer to a valid quiz
  const checkQuizId = data.quizzes.some((obj) => obj.quizId === quizId);
  if (!checkQuizId) {
    throw HTTPError(400, 'Quiz ID does not refer to a valid quiz');
  }
  // Checking if Quiz ID does not refer to a quiz that this user owns
  const tokenFound = data.tokens.find((obj) => obj.token === token);
  const userQuiz = data.userQuiz.find(userQuiz => userQuiz.userId === tokenFound.userId && userQuiz.quizId === quizId);
  if (!userQuiz) {
    throw HTTPError(400, 'Quiz ID does not refer to a quiz that this user owns');
  }
  // Checking if Question string is less than 5 characters in length or greater than 50 characters in length
  if (questionBody.question.length < 5 || questionBody.question.length > 50) {
    throw HTTPError(400, 'Question string is less than 5 characters in length or greater than 50 characters in length');
  }
  // Checking if The question has more than 6 answers or less than 2 answers
  if (questionBody.answers.length < 2 || questionBody.answers.length > 6) {
    throw HTTPError(400, 'The question has more than 6 answers or less than 2 answers');
  }
  // Checking if The question duration is not a positive number
  if (questionBody.duration <= 0) {
    throw HTTPError(400, 'The question duration is not a positive number');
  }
  // Checking if The sum of the question durations in the quiz exceeds 3 minutes
  const quizIndex = data.quizzes.findIndex((quiz) => quiz.quizId === quizId);
  const durationBeforeCreate = data.quizzes[quizIndex].duration;
  const durationAfterCreate = durationBeforeCreate + questionBody.duration;
  if (durationAfterCreate > 180) {
    throw HTTPError(400, 'The sum of the question durations in the quiz exceeds 3 minutes');
  }
  // Checking if The points awarded for the question are less than 1 or greater than 10
  if (questionBody.points > 10 || questionBody.points < 1) {
    throw HTTPError(400, 'The points awarded for the question are less than 1 or greater than 10');
  }
  // Checking if The length of any answer is shorter than 1 character long, or longer than 30 characters long
  if (questionBody.answers.some(obj => obj.answer.length < 1 || obj.answer.length > 30)) {
    throw HTTPError(400, 'The length of any answer is shorter than 1 character long, or longer than 30 characters long');
  }
  // Checking if Any answer strings are duplicates of one another (within the same question)
  if (questionBody.answers.some((answer, i) => questionBody.answers.findIndex(a => a.answer === answer.answer) !== i)) {
    throw HTTPError(400, 'Any answer strings are duplicates of one another (within the same question)');
  }
  // Checking if There are no correct answers
  if (!questionBody.answers.some(answer => answer.correct)) {
    throw HTTPError(400, 'There are no correct answers');
  }
  // Checking if The thumbnailUrl is an empty string
  if (questionBody.thumbnailUrl === '') {
    throw HTTPError(400, 'The thumbnailUrl is an empty string');
  }
  // Checking if The thumbnailUrl does not return to a valid file and The thumbnailUrl, when fetched, is not a JPG or PNg file type
  const res = request(
    'GET',
    questionBody.thumbnailUrl
  );
  const contentType = res.headers['content-type'];
  if (!contentType.startsWith('image/')) {
    throw HTTPError(400, 'The thumbnailUrl does not return to a valid file');
  } else if (!['image/jpeg', 'image/png'].includes(contentType)) {
    throw HTTPError(400, 'The thumbnailUrl, when fetched, is not a JPG or PNg file type');
  }
  const fileName = questionBody.thumbnailUrl.substring(questionBody.thumbnailUrl.lastIndexOf('/') + 1);
  const unixTimestamp = Date.now();
  const imagePath = `image/${unixTimestamp}_${fileName}`;
  fs.writeFileSync(imagePath, res.getBody(), 'binary');
  const newImgUrl = `${SERVER_URL}/${imagePath}`;

  // Creating questions for quiz
  const question: Question = {
    questionId: generateRandomNumber(),
    question: questionBody.question,
    duration: questionBody.duration,
    points: questionBody.points,
    answers: questionBody.answers.map(answer => ({
      answerId: generateRandomNumber(),
      answer: answer.answer,
      colour: generateRandomColour(),
      correct: answer.correct
    })),
    thumbnailUrl: newImgUrl,
  };
  data.quizzes[quizIndex].timeLastEdited = Date.now();
  data.quizzes[quizIndex].questions.push(question);
  const questionFound = data.quizzes.find((obj) => obj.quizId === quizId);
  data.quizzes[quizIndex].numQuestions = questionFound.questions.length;
  data.quizzes[quizIndex].duration = durationAfterCreate;
  setData(data);
  return {
    questionId: question.questionId,
  };
}

/**
 * Create a new stub question for a particular quiz.
 *
 * returns questionId
 *
 * @param {string} token - unique identifier for token.
 * @param {integer} quizId - unique identifier for quiz.
 * @param {object} questionBody - question info
 * @returns {integer}} - questionId
 */
export function adminQuizQuestionUpdateV2(quizId: number, questionId: number, token: string, questionBody: {question: string, duration: number, points: number, answers: {answer: string, correct: boolean}[], thumbnailUrl: string}) {
  const data = getData();
  // Checking if Token is not a valid structure
  if (!token || typeof token !== 'string') {
    throw HTTPError(401, 'Token is not a valid structure');
  }
  // Checking if Provided token is valid structure, but is not for a currently logged in session
  const tokenFound = data.tokens.find((user) => user.token === token);
  if (!tokenFound) {
    throw HTTPError(403, 'Provided token is valid structure, but is not for a currently logged in session');
  }
  // Checking if Quiz ID does not refer to a valid quiz
  const quizFound = data.quizzes.find((obj) => obj.quizId === quizId);
  if (!quizFound) {
    throw HTTPError(400, 'Quiz ID does not refer to a valid quiz');
  }
  // Checking if Quiz ID does not refer to a quiz that this user owns
  const userQuiz = data.userQuiz.find(userQuiz => userQuiz.userId === tokenFound.userId && userQuiz.quizId === quizId);
  if (!userQuiz) {
    throw HTTPError(400, 'Quiz ID does not refer to a quiz that this user owns');
  }
  // Checking if Question Id does not refer to a valid question within this quiz
  const questionFound = quizFound.questions.find((question) => question.questionId === questionId);
  if (!questionFound) {
    throw HTTPError(400, 'Question Id does not refer to a valid question within this quiz');
  }
  // Checking if Question string is less than 5 characters in length or greater than 50 characters in length
  if (questionBody.question.length < 5 || questionBody.question.length > 50) {
    throw HTTPError(400, 'Question string is less than 5 characters in length or greater than 50 characters in length');
  }
  // Checking if The question has more than 6 answers or less than 2 answers
  if (questionBody.answers.length < 2 || questionBody.answers.length > 6) {
    throw HTTPError(400, 'The question has more than 6 answers or less than 2 answers');
  }
  // Checking if The question duration is not a positive number
  if (questionBody.duration <= 0) {
    throw HTTPError(400, 'The question duration is not a positive number');
  }
  // Checking if If this question were to be updated, the sum of the question durations in the quiz exceeds 3 minutes
  const quizIndex = data.quizzes.findIndex((quiz) => quiz.quizId === quizId);
  const durationBeforeUpdate = data.quizzes[quizIndex].duration;
  const durationAfterUpdate = durationBeforeUpdate + questionBody.duration;
  if (durationAfterUpdate > 180) {
    throw HTTPError(400, 'If this question were to be updated, the sum of the question durations in the quiz exceeds 3 minutes');
  }
  // Checking if The points awarded for the question are less than 1 or greater than 10
  if (questionBody.points > 10 || questionBody.points < 1) {
    throw HTTPError(400, 'The points awarded for the question are less than 1 or greater than 10');
  }
  // Checking if The length of any answer is shorter than 1 character long, or longer than 30 characters long
  if (questionBody.answers.some(obj => obj.answer.length < 1 || obj.answer.length > 30)) {
    throw HTTPError(400, 'The length of any answer is shorter than 1 character long, or longer than 30 characters long');
  }
  // Checking if Any answer strings are duplicates of one another (within the same question)
  if (questionBody.answers.some((answer, i) => questionBody.answers.findIndex(a => a.answer === answer.answer) !== i)) {
    throw HTTPError(400, 'Any answer strings are duplicates of one another (within the same question)');
  }
  // Checking if There are no correct answers
  if (!questionBody.answers.some(answer => answer.correct)) {
    throw HTTPError(400, 'There are no correct answers');
  }
  // Checking if The thumbnailUrl is an empty string
  if (questionBody.thumbnailUrl === '') {
    throw HTTPError(400, 'The thumbnailUrl is an empty string');
  }
  // Checking if The thumbnailUrl does not return to a valid file and The thumbnailUrl, when fetched, is not a JPG or PNg file type
  const res = request(
    'GET',
    questionBody.thumbnailUrl
  );
  const contentType = res.headers['content-type'];
  if (!contentType.startsWith('image/')) {
    throw HTTPError(400, 'The thumbnailUrl does not return to a valid file');
  } else if (!['image/jpeg', 'image/png'].includes(contentType)) {
    throw HTTPError(400, 'The thumbnailUrl, when fetched, is not a JPG or PNg file type');
  }
  const fileName = questionBody.thumbnailUrl.substring(questionBody.thumbnailUrl.lastIndexOf('/') + 1);
  const unixTimestamp = Date.now();
  const imagePath = `image/${unixTimestamp}_${fileName}`;
  fs.writeFileSync(imagePath, res.getBody(), 'binary');
  const newImgUrl = `${SERVER_URL}/${imagePath}`;

  const questionIndex = quizFound.questions.findIndex((question) => question.questionId === questionId);
  const updatedQuestion: Question = {
    questionId: questionId,
    question: questionBody.question,
    duration: questionBody.duration,
    points: questionBody.points,
    answers: questionBody.answers.map(answer => ({
      answerId: generateRandomNumber(),
      answer: answer.answer,
      colour: generateRandomColour(),
      correct: answer.correct
    })),
    thumbnailUrl: newImgUrl,
  };
  data.quizzes[quizIndex].questions[questionIndex] = updatedQuestion;
  quizFound.timeLastEdited = Date.now();
  quizFound.duration = durationAfterUpdate;
  setData(data);
  return {};
}

/**
 * Delete a particular question from the quiz
 *
 * returns empty object
 *
 * @param {string} token - unique identifier for token.
 * @param {integer} quizId - unique identifier for quiz.
 * @param {integer} questionId - unique identifier for question
 * @returns {{}}
 */
export function adminQuizQuestionRemoveV2(quizId: number, questionId: number, token: string) {
  const data = getData();
  // Checking if Token is not a valid structure
  if (!token || typeof token !== 'string') {
    throw HTTPError(401, 'Token is not a valid structure');
  }
  // Checking if Provided token is valid structure, but is not for a currently logged in session
  const tokenFound = data.tokens.find((user) => user.token === token);
  if (!tokenFound) {
    throw HTTPError(403, 'Provided token is valid structure, but is not for a currently logged in session');
  }
  // Checking if Quiz ID does not refer to a valid quiz
  const quizFound = data.quizzes.find((obj) => obj.quizId === quizId);
  if (!quizFound) {
    throw HTTPError(400, 'Quiz ID does not refer to a valid quiz');
  }
  // Checking if Quiz ID does not refer to a quiz that this user owns
  const userQuiz = data.userQuiz.find(userQuiz => userQuiz.userId === tokenFound.userId && userQuiz.quizId === quizId);
  if (!userQuiz) {
    throw HTTPError(400, 'Quiz ID does not refer to a quiz that this user owns');
  }
  // Checking if Question Id does not refer to a valid question within this quiz
  const questionFound = quizFound.questions.find((question) => question.questionId === questionId);
  if (!questionFound) {
    throw HTTPError(400, 'Question Id does not refer to a valid question within this quiz');
  }
  // Checking if All sessions for this quiz must be in END state
  const quizStateCheck = data.quizSessions.filter((session) => session.quiz.quizId === quizId && session.state !== States.END);
  if (quizStateCheck.length > 0) {
    throw HTTPError(400, 'All sessions for this quiz must be in END state');
  }
  const questionIndex = quizFound.questions.findIndex((question) => question.questionId === questionId);
  quizFound.questions.splice(questionIndex, 1);
  setData(data);
  return {};
}

/**
 * Provided authentication token, quiz id and question id and position to move quiz question
 *
 * returns an empty object
 *
 * @param {string} token - unique identifier for token.
 * @param {integer} quizId - unique identifier for quiz.
 * @param {integer} questionId - unique identifier for question.
 * @param {integer} newPosition - question's position in the quiz(the first question's postion is 0).
 * @returns {{}}} - empty object
 */
export function adminQuizQuestionMoveV2(quizId: number, questionId: number, token: string, newPosition: number) {
  const data = getData();
  // Checking if Token is not a valid structure
  if (!token || typeof token !== 'string') {
    throw HTTPError(401, 'Token is not a valid structure');
  }
  // Checking if Provided token is valid structure, but is not for a currently logged in session
  const tokenFound = data.tokens.find((user) => user.token === token);
  if (!tokenFound) {
    throw HTTPError(403, 'Provided token is valid structure, but is not for a currently logged in session');
  }
  // Checking if Quiz ID does not refer to a valid quiz
  const quizFound = data.quizzes.find((obj) => obj.quizId === quizId);
  if (!quizFound) {
    throw HTTPError(400, 'Quiz ID does not refer to a valid quiz');
  }
  // Checking if Quiz ID does not refer to a quiz that this user owns
  const userQuiz = data.userQuiz.find(userQuiz => userQuiz.userId === tokenFound.userId && userQuiz.quizId === quizId);
  if (!userQuiz) {
    throw HTTPError(400, 'Quiz ID does not refer to a quiz that this user owns');
  }
  // Checking if Question Id does not refer to a valid question within this quiz
  const questionFound = quizFound.questions.find((question) => question.questionId === questionId);
  if (!questionFound) {
    throw HTTPError(400, 'Question Id does not refer to a valid question within this quiz');
  }
  // Checking if NewPosition is less than 0, or NewPosition is greater than n-1 where n is the number of questions
  if (newPosition < 0 || newPosition > quizFound.questions.length) {
    throw HTTPError(400, 'NewPosition is less than 0, or NewPosition is greater than n-1 where n is the number of questions');
  }
  // Checking if NewPosition is the position of the current question
  const questionIndex = quizFound.questions.findIndex((question) => question.questionId === questionId);
  if (questionIndex === newPosition) {
    throw HTTPError(400, 'NewPosition is the position of the current question');
  }
  const questionRemoved = quizFound.questions.splice(questionIndex, 1)[0];
  quizFound.questions.splice(newPosition, 0, questionRemoved);
  quizFound.timeLastEdited = Date.now();
  setData(data);
  return {};
}

/**
 * Provided authentication token, quiz id and question id and duplicate quiz question
 *
 * returns an empty object
 *
 * @param {string} token - unique identifier for token.
 * @param {integer} quizId - unique identifier for quiz.
 * @param {integer} questionId - unique identifier for question.
 * @returns {newQuestionId: number} - return new questionId.
 */
export function adminQuizQuestionDuplicateV2(quizId: number, questionId: number, token: string) {
  const data = getData();
  // Checking if Token is not a valid structure
  if (!token || typeof token !== 'string') {
    throw HTTPError(401, 'Token is not a valid structure');
  }
  // Checking if Provided token is valid structure, but is not for a currently logged in session
  const tokenFound = data.tokens.find((user) => user.token === token);
  if (!tokenFound) {
    throw HTTPError(403, 'Provided token is valid structure, but is not for a currently logged in session');
  }
  // Checking if Quiz ID does not refer to a valid quiz
  const quizFound = data.quizzes.find((obj) => obj.quizId === quizId);
  if (!quizFound) {
    throw HTTPError(400, 'Quiz ID does not refer to a valid quiz');
  }
  // Checking if Quiz ID does not refer to a quiz that this user owns
  const userQuiz = data.userQuiz.find(userQuiz => userQuiz.userId === tokenFound.userId && userQuiz.quizId === quizId);
  if (!userQuiz) {
    throw HTTPError(400, 'Quiz ID does not refer to a quiz that this user owns');
  }
  // Checking if Question Id does not refer to a valid question within this quiz
  const questionFound = quizFound.questions.find((question) => question.questionId === questionId);
  if (!questionFound) {
    throw HTTPError(400, 'Question Id does not refer to a valid question within this quiz');
  }
  const questionIndex = quizFound.questions.findIndex((question) => question.questionId === questionId);
  const newQuestionId = generateRandomNumber();
  const question = { ...quizFound.questions[questionIndex], questionId: newQuestionId };
  quizFound.questions.splice(questionIndex + 1, 0, question);
  quizFound.timeLastEdited = Date.now();
  setData(data);
  return {
    questionId: newQuestionId,
  };
}
// ====================================================================
// ========================= iter3 (New) ==============================
// ====================================================================

/**
 * Update the imgUrl of the quiz
 *
 * returns empty object
 *
 * @param {integer} quizId - unique identifier for quiz
 * @param {string} token - unique identifier for session
 * @param {string} imgUrl - new imgUrl
 * @returns {}
 */
export function adminQuizThumbnailUpdate(quizId: number, token: string, imgUrl: string) {
  const data = getData();
  // Checking if Token is not a valid structure
  if (!token || typeof token !== 'string') {
    throw HTTPError(401, 'Token is not a valid structure');
  }
  // Checking if Provided token is valid structure, but is not for a currently logged in session
  const tokenFound = data.tokens.find((user) => user.token === token);
  if (!tokenFound) {
    throw HTTPError(403, 'Provided token is valid structure, but is not for a currently logged in session');
  }
  // Checking if Quiz ID does not refer to a valid quiz
  const quizFound = data.quizzes.find((quiz) => quiz.quizId === quizId);
  if (!quizFound) {
    throw HTTPError(400, 'Quiz ID does not refer to a valid quiz');
  }
  // Checking if Quiz ID does not refer to a quiz that this user owns
  const userQuiz = data.userQuiz.find(userQuiz => userQuiz.userId === tokenFound.userId && userQuiz.quizId === quizId);
  if (!userQuiz) {
    throw HTTPError(400, 'Quiz ID does not refer to a quiz that this user owns');
  }
  // Checking if The thumbnailUrl does not return to a valid file and The thumbnailUrl, when fetched, is not a JPG or PNg file type
  const res = request(
    'GET',
    imgUrl
  );
  const contentType = res.headers['content-type'];
  if (!contentType.startsWith('image/')) {
    throw HTTPError(400, 'The thumbnailUrl does not return to a valid file');
  } else if (!['image/jpeg', 'image/png'].includes(contentType)) {
    throw HTTPError(400, 'The thumbnailUrl, when fetched, is not a JPG or PNg file type');
  }
  const fileName = imgUrl.substring(imgUrl.lastIndexOf('/') + 1);
  const unixTimestamp = Date.now();
  const imagePath = `image/${unixTimestamp}_${fileName}`;
  fs.writeFileSync(imagePath, res.getBody(), 'binary');
  const newImgUrl = `${SERVER_URL}/${imagePath}`;
  quizFound.thumbnailUrl = newImgUrl;

  setData(data);
  return {};
}

/**
 * Retrieves active and inactive session ids (sorted in ascending order) for a quiz
 *
 * returns the sessionId of activeSessions and inactiveSessions
 *
 * @param {string} token - unique identifier for token.
 * @param {integer} quizId - unique identifier for quiz.
 * @returns {activeSessions: numebr[], inactiveSessions: number[]}
 */
export function adminQuizSessionView(token: string, quizId: number) {
  const data = getData();
  const activeSessions: number[] = [];
  const inactiveSessions: number[] = [];
  const sessionWithQuiz = data.quizSessions.filter((session) => session.quiz.quizId === quizId);
  sessionWithQuiz.forEach((session) => {
    if (session.state !== States.END) {
      activeSessions.push(session.sessionId);
    } else {
      inactiveSessions.push(session.sessionId);
    }
  });
  activeSessions.sort((a, b) => a - b);
  inactiveSessions.sort((a, b) => a - b);
  return {
    activeSessions: activeSessions,
    inactiveSessions: inactiveSessions
  };
}

/**
 * Start a new session for a quiz
 *
 * returns sessionId
 *
 * @param {string} token - unique identifier for token.
 * @param {integer} quizId - unique identifier for quiz.
 * @param {integer} autoStartNum - autostartNum is number of people to autostart the quiz once that number of people join.
 * @returns {integer}} - questionId
 */
export function adminQuizSessionStart(quizId: number, token: string, autoStartNum: number) {
  const data = getData();
  // Checking if Token is not a valid structure
  if (!token || typeof token !== 'string') {
    throw HTTPError(401, 'Token is not a valid structure');
  }
  // Checking if Provided token is valid structure, but is not for a currently logged in session
  const tokenFound = data.tokens.find((user) => user.token === token);
  if (!tokenFound) {
    throw HTTPError(403, 'Provided token is valid structure, but is not for a currently logged in session');
  }
  // Checking if Quiz ID does not refer to a valid quiz
  const quizFound = data.quizzes.find((quiz) => quiz.quizId === quizId);
  if (!quizFound) {
    throw HTTPError(400, 'Quiz ID does not refer to a valid quiz');
  }
  // Checking if Quiz ID does not refer to a quiz that this user owns
  const userQuiz = data.userQuiz.find(userQuiz => userQuiz.userId === tokenFound.userId && userQuiz.quizId === quizId);
  if (!userQuiz) {
    throw HTTPError(400, 'Quiz ID does not refer to a quiz that this user owns');
  }
  // Checking if autoStartNum is a number greater than 50
  if (autoStartNum > 50) {
    throw HTTPError(400, 'autoStartNum is a number greater than 50');
  }
  // Checking if A maximum of 10 sessions that are not in END state currently exist
  const activeSessionNum = data.quizSessions.filter((session) => session.state !== States.END);
  if (activeSessionNum.length >= 10) {
    throw HTTPError(400, 'A maximum of 10 sessions that are not in END state currently exist');
  }
  // Checking if The quiz does not have any questions in it
  if (quizFound.questions.length === 0) {
    throw HTTPError(400, 'The quiz does not have any questions in it');
  }
  // Generate a random sessionId
  let randomNum: number;
  do {
    randomNum = Math.floor(Math.random() * 99999) + 1;
  } while (data.quizSessions.some((session) => session.sessionId === randomNum));
  const sessionId = randomNum;

  const newQuestionResult: QuestionResult[] = quizFound.questions.map((question) => ({
    questionId: question.questionId,
    questionCorrectBreakdown: question.answers
      .filter((answer) => answer.correct)
      .map((correctAnswer) => ({
        answerId: correctAnswer.answerId,
        playersCorrect: [],
      })),
    averageAnswerTime: 0,
    percentCorrect: 0,
  }));

  const newPlayersAnswerTime: PlayerAnswerTime[] = quizFound.questions.map((question) => ({
    questionId: question.questionId,
    questionStartTime: 0,
    answerTime: [],
  }));

  const newSession: QuizSession = {
    sessionId: sessionId,
    state: States.LOBBY,
    atQuestion: 0,
    players: [],
    quiz: quizFound,
    autoStartNum: autoStartNum,
    playerNum: 0,
    result: {
      usersRankedByScore: [],
      questionResults: newQuestionResult,
    },
    playersAnswerTime: newPlayersAnswerTime,
    playersMessage: [],
  };
  data.quizSessions.push(newSession);
  setData(data);
  return { sessionId: sessionId };
}

/**
 * update a session state
 *
 * returns empty object
 *
 * @param {integer} quizId - unique identifier for quiz
 * @param {integer} sessionId - unique identifier for session
 * @param {string} token - session key for admin user
 * @param {string} action - guest player's name
 * @returns {{}}
 */
export function adminQuizSessionUpdate(quizId: number, sessionId: number, token: string, action: string) {
  const data = getData();
  // Checking if Token is not a valid structure
  if (!token || typeof token !== 'string') {
    throw HTTPError(401, 'Token is not a valid structure');
  }
  // Checking if Provided token is valid structure, but is not for a currently logged in session
  const tokenFound = data.tokens.find((user) => user.token === token);
  if (!tokenFound) {
    throw HTTPError(403, 'Provided token is valid structure, but is not for a currently logged in session');
  }
  // Checking if Quiz ID does not refer to a valid quiz
  const quizFound = data.quizzes.find((quiz) => quiz.quizId === quizId);
  if (!quizFound) {
    throw HTTPError(400, 'Quiz ID does not refer to a valid quiz');
  }
  // Checking if Quiz ID does not refer to a quiz that this user owns
  const userQuiz = data.userQuiz.find(userQuiz => userQuiz.userId === tokenFound.userId && userQuiz.quizId === quizId);
  if (!userQuiz) {
    throw HTTPError(400, 'Quiz ID does not refer to a quiz that this user owns');
  }
  const sessionFound = data.quizSessions.find((session) => session.sessionId === sessionId);
  // Checking if Session Id does not refer to a valid session within this quiz
  const quizHasSessionId = data.quizSessions.filter((session) => session.quiz.quizId === quizId);
  const validSessionId = quizHasSessionId.map((session) => session.sessionId);
  if (!validSessionId.includes(sessionId)) {
    throw HTTPError(400, 'Session Id does not refer to a valid session within this quiz');
  }
  // Checking if Action provided is not a valid Action enum
  // const actionArray: string[] = Object.values<string>(Actions);
  const actionArray: string[] = Object.values<string>(Actions);
  if (!actionArray.includes(action)) {
    throw HTTPError(400, 'Action provided is not a valid Action enum');
  }
  // Checking if Action enum cannot be applied in the current state (see spec for details)
  const currentState = sessionFound.state;
  switch (action) {
    case Actions.NEXT_QUESTION:
      if (![States.LOBBY, States.QUESTION_CLOSE, States.ANSWER_SHOW].includes(currentState)) {
        throw HTTPError(400, 'Action enum cannot be applied in the current state (see spec for details)');
      }
      sessionFound.state = States.QUESTION_COUNTDOWN;
      sessionFound.atQuestion++;
      setTimeout(() => {
        sessionFound.state = States.QUESTION_OPEN;
        const questionStartTime = Date.now();
        const currentQuestion = sessionFound.quiz.questions[sessionFound.atQuestion - 1];
        sessionFound.playersAnswerTime[sessionFound.atQuestion - 1].questionStartTime = questionStartTime;
        const questionDuration = currentQuestion.duration * 1000;
        setData(data);
        setTimeout(() => {
          sessionFound.state = States.QUESTION_CLOSE;
          setData(data);
        }, questionDuration);
      }, 100);
      break;
    case Actions.GO_TO_ANSWER:
      if (![States.QUESTION_CLOSE, States.QUESTION_OPEN].includes(currentState)) {
        throw HTTPError(400, 'Action enum cannot be applied in the current state (see spec for details)');
      }
      sessionFound.state = States.ANSWER_SHOW;
      break;
    case Actions.GO_TO_FINAL_RESULTS:
      if (![States.ANSWER_SHOW, States.QUESTION_CLOSE].includes(currentState)) {
        throw HTTPError(400, 'Action enum cannot be applied in the current state (see spec for details)');
      }
      sessionFound.state = States.FINAL_RESULTS;
      break;
    case Actions.END:
      if (currentState === States.END) {
        throw HTTPError(400, 'Action enum cannot be applied in the current state (see spec for details)');
      }
      sessionFound.state = States.END;
      break;
  }
  setData(data);
  return ({});
}

/**
 * get session status
 *
 * returns empty object
 *
 * @param {integer} quizId - unique identifier for quiz
 * @param {integer} sessionId - unique identifier for session
 * @param {string} token - session key for admin user
 * @returns {state: States, atQuestion: number, players: string[], metadata: Quiz, duration: number, thumbnailUrl: string} - SessionStatus
 */
export function adminQuizSessionStatus(quizId: number, sessionId: number, token: string) {
  const data = getData();
  // Checking if Token is not a valid structure
  if (!token || typeof token !== 'string') {
    throw HTTPError(401, 'Token is not a valid structure');
  }
  // Checking if Provided token is valid structure, but is not for a currently logged in session
  const tokenFound = data.tokens.find((user) => user.token === token);
  if (!tokenFound) {
    throw HTTPError(403, 'Provided token is valid structure, but is not for a currently logged in session');
  }
  // Checking if Quiz ID does not refer to a valid quiz
  const quizFound = data.quizzes.find((quiz) => quiz.quizId === quizId);
  if (!quizFound) {
    throw HTTPError(400, 'Quiz ID does not refer to a valid quiz');
  }
  // Checking if Quiz ID does not refer to a quiz that this user owns
  const userQuiz = data.userQuiz.find(userQuiz => userQuiz.userId === tokenFound.userId && userQuiz.quizId === quizId);
  if (!userQuiz) {
    throw HTTPError(400, 'Quiz ID does not refer to a quiz that this user owns');
  }
  const sessionFound = data.quizSessions.find((session) => session.sessionId === sessionId);
  // Checking if Session Id does not refer to a valid session within this quiz
  const quizHasSessionId = data.quizSessions.filter((session) => session.quiz.quizId === quizId);
  const validSessionId = quizHasSessionId.map((session) => session.sessionId);
  if (!validSessionId.includes(sessionId)) {
    throw HTTPError(400, 'Session Id does not refer to a valid session within this quiz');
  }
  return {
    state: sessionFound.state,
    atQuestion: sessionFound.atQuestion,
    players: sessionFound.players,
    metadata: sessionFound.quiz,
  };
}

/**
 * Get the final results for all players for a completed quiz session
 *
 * returns result of that session
 *
 * @param {integer} quizId - unique identifier for quiz
 * @param {integer} sessionId - unique identifier for session
 * @param {string} token - session key for admin user
 * @returns {usersRankedByScore: [name: string, score: number], questionResults: [{ questionId: number, questionCorrectBreakdown: [{answerId: number, playerCorrect: string[]}], averageAnswerTime: number, percentCorrect: number}]} - session final result
 */
export function adminQuizSessionResult(quizId: number, sessionId: number, token: string) {
  const data = getData();
  // Checking if Token is not a valid structure
  if (!token || typeof token !== 'string') {
    throw HTTPError(401, 'Token is not a valid structure');
  }
  // Checking if Provided token is valid structure, but is not for a currently logged in session
  const tokenFound = data.tokens.find((user) => user.token === token);
  if (!tokenFound) {
    throw HTTPError(403, 'Provided token is valid structure, but is not for a currently logged in session');
  }
  // Checking if Quiz ID does not refer to a valid quiz
  const quizFound = data.quizzes.find((quiz) => quiz.quizId === quizId);
  if (!quizFound) {
    throw HTTPError(400, 'Quiz ID does not refer to a valid quiz');
  }
  // Checking if Quiz ID does not refer to a quiz that this user owns
  const userQuiz = data.userQuiz.find(userQuiz => userQuiz.userId === tokenFound.userId && userQuiz.quizId === quizId);
  if (!userQuiz) {
    throw HTTPError(400, 'Quiz ID does not refer to a quiz that this user owns');
  }
  const sessionFound = data.quizSessions.find((session) => session.sessionId === sessionId);
  // Checking if Session Id does not refer to a valid session within this quiz
  const quizHasSessionId = data.quizSessions.filter((session) => session.quiz.quizId === quizId);
  const validSessionId = quizHasSessionId.map((session) => session.sessionId);
  if (!validSessionId.includes(sessionId)) {
    throw HTTPError(400, 'Session Id does not refer to a valid session within this quiz');
  }
  // Checking if Session is not in FINAL_RESULTS state
  if (sessionFound.state !== States.FINAL_RESULTS) {
    throw HTTPError(400, 'Session is not in FINAL_RESULTS state');
  }
  sessionFound.result.questionResults.forEach((result) => {
    const currentQuestion = sessionFound.quiz.questions.find((question) => question.questionId === result.questionId);
    const currentPoints = currentQuestion.points;
    const Breakdown = result.questionCorrectBreakdown.slice(0, 1)[0];
    const playerCorretNum = Breakdown.playersCorrect.length;
    for (let i = 0; i < playerCorretNum; i++) {
      const playerAnswerPosition = i + 1;
      const score = currentPoints / playerAnswerPosition;
      Breakdown.playersCorrect.forEach((name) => {
        const userFoundinRanking = sessionFound.result.usersRankedByScore.find((user) => user.name === name);
        if (userFoundinRanking) {
          userFoundinRanking.score += score;
        } else {
          sessionFound.result.usersRankedByScore.push({ name: name, score: score });
        }
      });
    }
  });
  sessionFound.players.forEach((playerName) => {
    if (!sessionFound.result.usersRankedByScore.some((user) => user.name === playerName)) {
      sessionFound.result.usersRankedByScore.push({ name: playerName, score: 0 });
    }
  });
  sessionFound.result.usersRankedByScore.sort((a, b) => b.score - a.score);
  return sessionFound.result;
}

/**
 * Get the a link to the final results (in CSV format) for all players for a completed quiz session
 *
 * returns url of local csv file
 *
 * @param {integer} quizId - unique identifier for quiz
 * @param {integer} sessionId - unique identifier for session
 * @param {string} token - session key for admin user
 * @returns { url: string } - url of local csv file
 */
export function adminQuizSessionResultCSV(quizId: number, sessionId: number, token: string) {
  const data = getData();
  // Checking if Token is not a valid structure
  if (!token || typeof token !== 'string') {
    throw HTTPError(401, 'Token is not a valid structure');
  }
  // Checking if Provided token is valid structure, but is not for a currently logged in session
  const tokenFound = data.tokens.find((user) => user.token === token);
  if (!tokenFound) {
    throw HTTPError(403, 'Provided token is valid structure, but is not for a currently logged in session');
  }
  // Checking if Quiz ID does not refer to a valid quiz
  const quizFound = data.quizzes.find((quiz) => quiz.quizId === quizId);
  if (!quizFound) {
    throw HTTPError(400, 'Quiz ID does not refer to a valid quiz');
  }
  // Checking if Quiz ID does not refer to a quiz that this user owns
  const userQuiz = data.userQuiz.find(userQuiz => userQuiz.userId === tokenFound.userId && userQuiz.quizId === quizId);
  if (!userQuiz) {
    throw HTTPError(400, 'Quiz ID does not refer to a quiz that this user owns');
  }
  const sessionFound = data.quizSessions.find((session) => session.sessionId === sessionId);
  // Checking if Session Id does not refer to a valid session within this quiz
  const quizHasSessionId = data.quizSessions.filter((session) => session.quiz.quizId === quizId);
  const validSessionId = quizHasSessionId.map((session) => session.sessionId);
  if (!validSessionId.includes(sessionId)) {
    throw HTTPError(400, 'Session Id does not refer to a valid session within this quiz');
  }
  // Checking if Session is not in FINAL_RESULTS state
  if (sessionFound.state !== States.FINAL_RESULTS) {
    throw HTTPError(400, 'Session is not in FINAL_RESULTS state');
  }
  let csv = 'Player';
  const playersInSession = data.players.filter((player) => player.sessionId === sessionId);
  playersInSession.sort((a, b) => a.playerName.localeCompare(b.playerName));
  quizFound.questions.forEach((question, index) => {
    const questionNumber = index + 1;
    csv += `,question${questionNumber}score,question${questionNumber}rank`;
  });
  csv += '\n';

  playersInSession.forEach((player) => {
    csv += player.playerName;
    quizFound.questions.forEach((question) => {
      const questionResult = sessionFound.result.questionResults.find((r) => r.questionId === question.questionId);
      if (questionResult.questionCorrectBreakdown[0].playersCorrect.includes(player.playerName)) {
        const questionCorrectBreakdown = questionResult.questionCorrectBreakdown[0];
        const rank = questionCorrectBreakdown.playersCorrect.indexOf(player.playerName) + 1;
        const questionPoint = question.points;
        const questionScore = questionPoint / rank;
        csv += `,${questionScore},${rank}`;
      } else {
        csv += ',0.0,0';
      }
    });
    csv += '\n';
  });

  const fileName = `${Date.now()}_final_result.csv`;
  fs.writeFileSync(`csv/${fileName}`, csv);
  return { url: `${SERVER_URL}/csv/${fileName}` };
}

/**
 * Allow a guest player to join a session
 *
 * returns playerId
 *
 * @param {integer} sessionId - unique identifier for session
 * @param {string} name - guest player's name
 * @returns {integer}} - playerId
 */
export function guestPlayerJoin(sessionId: number, name: string) {
  const data = getData();
  // Checking if Name of user entered is not unique (compared to other users who have already joined)
  if (name === '') {
    name = generateRandomName();
  }
  const sessionFound = data.quizSessions.find((session) => session.sessionId === sessionId);
  if (sessionFound.players.includes(name)) {
    throw HTTPError(400, 'Name of user entered is not unique (compared to other users who have already joined)');
  }
  // Checking if Session is not in LOBBY state
  if (sessionFound.state !== States.LOBBY) {
    throw HTTPError(400, 'Session is not in LOBBY state');
  }
  let randomNum: number;
  do {
    randomNum = Math.floor(Math.random() * 10000) + 1;
  } while (data.players.some((player) => player.playerId === randomNum));
  const playerId = randomNum;
  // Join
  sessionFound.players.push(name);
  sessionFound.playerNum++;
  const newPlayer: PlayerInfo = {
    sessionId: sessionId,
    playerId: playerId,
    playerName: name,
    currecntScore: 0,
  };
  data.players.push(newPlayer);
  setData(data);
  // Start Session if reach autoStartNum
  if (sessionFound.playerNum === sessionFound.autoStartNum) {
    sessionFound.state = States.QUESTION_COUNTDOWN;
    sessionFound.atQuestion++;
    setTimeout(() => {
      sessionFound.state = States.QUESTION_OPEN;
      const questionStartTime = Date.now();
      const currentQuestion = sessionFound.quiz.questions[sessionFound.atQuestion - 1];
      sessionFound.playersAnswerTime[sessionFound.atQuestion - 1].questionStartTime = questionStartTime;
      const questionDuration = currentQuestion.duration * 1000;
      setData(data);
      setTimeout(() => {
        sessionFound.state = States.QUESTION_CLOSE;
        setData(data);
      }, questionDuration);
    }, 100);
  }
  setData(data);
  return { playerId: playerId };
}

/**
 * Status of a guest player that has already joined a session
 *
 * returns info for the session
 *
 * @param {integer} playerId - unique identifier for guest player
 * @returns { state: string, numQuestions: number, atQuestion: number }
 */
export function guestPlayerStatus(playerId: number) {
  const data = getData();
  // Checking if If player ID does not exist
  const playerFound = data.players.find((player) => player.playerId === playerId);
  if (!playerFound) {
    throw HTTPError(400, 'If player ID does not exist');
  }
  // Find the relevant session
  const sessionFound = data.quizSessions.find((session) => session.players.includes(playerFound.playerName));
  return {
    state: sessionFound.state,
    numQuestions: sessionFound.quiz.numQuestions,
    atQuestion: sessionFound.atQuestion,
  };
}

/**
 * Get current question information for a player
 *
 * return current question info
 *
 * @param {integer} playerId - unique identifier for player
 * @param {integer} questionposition - current question
 * @returns { questionId: number, question: string, duration: number, thumbnailUrl: string, points: number, answers: Answer[]} - question info
 */
export function guestPlayerQuestionInfo(playerId: number, questionposition: number) {
  const data = getData();
  // Checking if If player ID does not exist
  const playerFound = data.players.find((player) => player.playerId === playerId);
  if (!playerFound) {
    throw HTTPError(400, 'If player ID does not exist');
  }
  // Checking if If question position is not valid for the session this player is in
  const sessionFound = data.quizSessions.find((session) => session.players.includes(playerFound.playerName));
  if (sessionFound.quiz.questions.length < questionposition) {
    throw HTTPError(400, 'If question position is not valid for the session this player is in');
  }
  // Checking if If session is not currently on this question
  if (sessionFound.quiz.questions.length >= questionposition && sessionFound.atQuestion !== questionposition) {
    throw HTTPError(400, 'If session is not currently on this question');
  }
  // Checking if Session is in LOBBY or END state
  if (sessionFound.state === States.LOBBY || sessionFound.state === States.END) {
    throw HTTPError(400, 'Session is in LOBBY or END state');
  }
  const questionFound = sessionFound.quiz.questions[questionposition - 1];
  const answerHasNoCorrect: AnswerHasNoCorrect[] = questionFound.answers.map((answer) => {
    const { correct, ...answerHasNoCorrect } = answer;
    return answerHasNoCorrect;
  });
  return {
    questionId: questionFound.questionId,
    question: questionFound.question,
    duration: questionFound.duration,
    thumbnailUrl: questionFound.thumbnailUrl,
    points: questionFound.points,
    answers: answerHasNoCorrect,
  };
}

/**
 * Player submission of answers
 *
 * returns empty object
 *
 * @param {integer} playerId - unique identifier for guest player
 * @param {integer} questionposition - currentquestion
 * @param {number[]} answerIds - player's submmited answers
 * @returns {{}} - empty object
 */
export function guestPlayerAnswerSubmit(answerIds: number[], playerId: number, questionposition: number) {
  const data = getData();
  // Checking if If player ID does not exist
  // Checking if If player ID does not exist
  const playerFound = data.players.find((player) => player.playerId === playerId);
  if (!playerFound) {
    throw HTTPError(400, 'If player ID does not exist');
  }
  // Checking if If question position is not valid for the session this player is in
  const sessionFound = data.quizSessions.find((session) => session.sessionId === playerFound.sessionId);
  if (sessionFound.quiz.questions.length < questionposition) {
    throw HTTPError(400, 'If question position is not valid for the session this player is in');
  }
  // Checking if Session is not in QUESTION_OPEN state
  if (sessionFound.state !== States.QUESTION_OPEN) {
    throw HTTPError(400, 'Session is not in QUESTION_OPEN state');
  }
  // Checking if If session is not yet up to this question
  if (sessionFound.quiz.questions.length >= questionposition && sessionFound.atQuestion !== questionposition) {
    throw HTTPError(400, 'If session is not yet up to this question');
  }
  // Checking if Answer IDs are not valid for this particular question
  const currentQuestion = sessionFound.quiz.questions[questionposition - 1];
  const allAnswerId = currentQuestion.answers.map((answer) => answer.answerId);
  const answerIdCheck = answerIds.filter((answerId) => !allAnswerId.includes(answerId));
  if (answerIdCheck.length > 0) {
    throw HTTPError(400, 'Answer IDs are not valid for this particular question');
  }
  // Checking if There are duplicate answer IDs provided
  const duplicateAnswerId = new Set(answerIds).size !== answerIds.length;
  if (duplicateAnswerId) {
    throw HTTPError(400, 'There are duplicate answer IDs provided');
  }
  // Checking if Less than 1 answer ID was submitted
  if (answerIds.length < 1) {
    throw HTTPError(400, 'Less than 1 answer ID was submitted');
  }
  const correctAnswers = currentQuestion.answers.filter((answer) => answer.correct === true);
  const correctAnswerIds = correctAnswers.map((correctanswer) => correctanswer.answerId);
  const playerCorrectCheck = correctAnswerIds.every((correctanswer) => answerIds.includes(correctanswer));
  if (correctAnswers.length === answerIds.length && playerCorrectCheck) {
    sessionFound.result.questionResults[questionposition - 1].questionCorrectBreakdown.forEach((breakdown) => breakdown.playersCorrect.push(playerFound.playerName));
  }
  const answerTimeFound = sessionFound.playersAnswerTime[questionposition - 1];
  const timeSubmit = Date.now();
  answerTimeFound.answerTime.push(timeSubmit);
  let sumCorrectAnswerTime = 0;
  answerTimeFound.answerTime.forEach((answerTime) => {
    const diff = answerTime - answerTimeFound.questionStartTime;
    sumCorrectAnswerTime += diff;
  });
  const correctPlayerNum = sessionFound.result.questionResults[questionposition - 1].questionCorrectBreakdown[0].playersCorrect.length;
  const sumAnswerTime = sumCorrectAnswerTime + (sessionFound.playerNum - correctPlayerNum) * sessionFound.quiz.duration;
  sessionFound.result.questionResults[questionposition - 1].averageAnswerTime = sumAnswerTime / sessionFound.playerNum;
  sessionFound.result.questionResults[questionposition - 1].percentCorrect = correctPlayerNum / sessionFound.playerNum * 100;
  setData(data);

  return {};
}

/**
 * Get the results for a particular question of the session a player is playing in
 *
 * questionResult of that question
 *
 * @param {integer} playerId - unique identifier for guest player
 * @param {integer} questionposition - currentquestion
 * @returns {questionId: number, questionCorrectBreakdown:[{ answerId: number, playerCorrect:string[], averageAnswerTime: number, percentCorrect: number }]}
 */
export function guestPlayerResult(playerId: number, questionposition: number) {
  const data = getData();
  // Checking if If player ID does not exist
  const playerFound = data.players.find((player) => player.playerId === playerId);
  if (!playerFound) {
    throw HTTPError(400, 'If player ID does not exist');
  }
  // Checking if If question position is not valid for the session this player is in
  const sessionFound = data.quizSessions.find((session) => session.sessionId === playerFound.sessionId);
  if (sessionFound.quiz.questions.length < questionposition) {
    throw HTTPError(400, 'If question position is not valid for the session this player is in');
  }
  // Checking if Session is not in ANSWER_SHOW state
  if (sessionFound.state !== States.ANSWER_SHOW) {
    throw HTTPError(400, 'Session is not in ANSWER_SHOW state');
  }
  // Checking if If session is not yet up to this question
  if (sessionFound.quiz.questions.length >= questionposition && sessionFound.atQuestion !== questionposition) {
    throw HTTPError(400, 'If session is not yet up to this question');
  }
  const resultInfo = sessionFound.result.questionResults[questionposition - 1];
  setData(data);
  return resultInfo;
}

/**
 * Get the final results for a whole session a player is playing in
 *
 * return session final result
 *
 * @param {integer} playerId - unique identifier for guest player
 * @param {integer} questionposition - currentquestion
 * @returns {usersRankedByScore: [name: string, score: number], questionResults: [{ questionId: number, questionCorrectBreakdown: [{answerId: number, playerCorrect: string[]}], averageAnswerTime: number, percentCorrect: number}]} - session final result
 */
export function guestPlayerSessionResult(playerId: number) {
  const data = getData();
  // Checking if If player ID does not exist
  const playerFound = data.players.find((player) => player.playerId === playerId);
  if (!playerFound) {
    throw HTTPError(400, 'If player ID does not exist');
  }
  // Checking if Session is not in FINAL_RESULTS state
  const sessionFound = data.quizSessions.find((session) => session.sessionId === playerFound.sessionId);
  if (sessionFound.state !== States.FINAL_RESULTS) {
    throw HTTPError(400, 'Session is not in FINAL_RESULTS state');
  }
  sessionFound.result.questionResults.forEach((result) => {
    const currentQuestion = sessionFound.quiz.questions.find((question) => question.questionId === result.questionId);
    const currentPoints = currentQuestion.points;
    const Breakdown = result.questionCorrectBreakdown.slice(0, 1)[0];
    const playerCorretNum = Breakdown.playersCorrect.length;
    for (let i = 0; i < playerCorretNum; i++) {
      const playerAnswerPosition = i + 1;
      const score = currentPoints / playerAnswerPosition;
      Breakdown.playersCorrect.forEach((name) => {
        const userFoundinRanking = sessionFound.result.usersRankedByScore.find((user) => user.name === name);
        if (userFoundinRanking) {
          userFoundinRanking.score += score;
        } else {
          sessionFound.result.usersRankedByScore.push({ name: name, score: score });
        }
      });
    }
  });
  sessionFound.players.forEach((playerName) => {
    if (!sessionFound.result.usersRankedByScore.some((user) => user.name === playerName)) {
      sessionFound.result.usersRankedByScore.push({ name: playerName, score: 0 });
    }
  });
  sessionFound.result.usersRankedByScore.sort((a, b) => b.score - a.score);
  return sessionFound.result;
}

/**
 * Send a new chat message to everyone in the session
 *
 * returns empty object
 *
 * @param { messeage: { messageBody: string }} - message player send to chat
 * @param { number } playerId - unique identifier of player
 * @returns {{}} - empty obejct
 */
export function playerMessageSend(playerId: number, message: { messageBody: string }) {
  const data = getData();
  // If player ID does not exist
  const playerfound = data.players.find((player) => player.playerId === playerId);
  if (!playerfound) {
    throw HTTPError(400, 'If player ID does not exist');
  }
  // If message body is less than 1 character or more than 100 characters
  if (message.messageBody.length < 1 || message.messageBody.length > 100) {
    throw HTTPError(400, 'If message body is less than 1 character or more than 100 characters');
  }
  const timesent = Math.floor(Date.now() / 1000);
  const newmessage: PlayerMessage = {
    messageBody: message.messageBody,
    playerId: playerfound.playerId,
    playerName: playerfound.playerName,
    timeSent: timesent
  };
  const sessionfound = data.quizSessions.find((session) => session.players.includes(playerfound.playerName));
  sessionfound.playersMessage.push(newmessage);
  setData(data);
  return {};
}
/**
 * Send a playerId
 *
 * Return all messages that are in the same session as the player
 *
 * @param { number } playerId - unique identifier of player
 * @returns { messages: [{ messageBody: string, playerId: number, playerName: string, timeSeng: number}]} - all chat messeages
 */
export function playerMessageView(playerId: number) {
  const data = getData();
  // Checking if If player ID does not exist
  const playerFound = data.players.find((player) => player.playerId === playerId);
  if (!playerFound) {
    throw HTTPError(400, 'If player ID does not exist');
  }
  const sessionFound = data.quizSessions.find((session) => session.players.includes(playerFound.playerName));
  setData(data);
  return {
    messages: sessionFound.playersMessage
  };
}
