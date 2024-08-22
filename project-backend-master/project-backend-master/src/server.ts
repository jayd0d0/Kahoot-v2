import express, { json, Request, Response } from 'express';
import { echo } from './echo';
import morgan from 'morgan';
import config from './config.json';
import cors from 'cors';
import errorHandler from 'middleware-http-errors';
import YAML from 'yaml';
import sui from 'swagger-ui-express';
import fs from 'fs';
import {
  adminAuthRegister,
  adminAuthLogin,
  adminUserDetails,
  adminAuthLogout,
  adminUserPasswordUpdate,
  adminUserDetailsUpdate,
  adminAuthLogoutV2,
  adminUserDetailsV2,
  adminUserDetailsUpdateV2,
  adminUserPasswordUpdateV2,
} from './auth';
import {
  adminQuizCreate,
  adminQuizList,
  adminQuizInfo,
  adminQuizNameUpdate,
  adminQuizDescriptionUpdate,
  adminQuizRestore,
  adminQuizRemove,
  adminQuizQuestionCreate,
  adminQuizQuestionRemove,
  adminQuizTrashView,
  adminQuizQuestionUpdate,
  adminQuizTrashEmpty,
  adminQuizQuestionMove,
  adminQuizQuestionDuplicate,
  adminQuizTransfer,
  adminQuizListV2,
  adminQuizCreateV2,
  adminQuizInfoV2,
  adminQuizRemoveV2,
  adminQuizNameUpdateV2,
  adminQuizDescriptionUpdateV2,
  adminQuizTrashViewV2,
  adminQuizRestoreV2,
  adminQuizTrashEmptyV2,
  adminQuizTransferV2,
  adminQuizQuestionCreateV2,
  adminQuizSessionStart,
  guestPlayerJoin,
  guestPlayerStatus,
  adminQuizThumbnailUpdate,
  adminQuizQuestionUpdateV2,
  playerMessageSend,
  playerMessageView,
  adminQuizSessionStatus,
  adminQuizSessionUpdate,
  adminQuizQuestionRemoveV2,
  adminQuizQuestionMoveV2,
  adminQuizQuestionDuplicateV2,
  guestPlayerQuestionInfo,
  guestPlayerAnswerSubmit,
  guestPlayerResult,
  adminQuizSessionResult,
  adminQuizSessionResultCSV,
  guestPlayerSessionResult,
  adminQuizSessionView,
} from './quiz';
import { clear } from './other';

// Set up web app
const app = express();
// Use middleware that allows us to access the JSON body of requests
app.use(json());
// Use middleware that allows for access from other domains
app.use(cors());
// for producing the docs that define the API
const file = fs.readFileSync('./swagger.yaml', 'utf8');
app.get('/', (req: Request, res: Response) => res.redirect('/docs'));
app.use(
  '/docs',
  sui.serve,
  sui.setup(YAML.parse(file), {
    swaggerOptions: { docExpansion: config.expandDocs ? 'full' : 'list' },
  })
);

const PORT: number = parseInt(process.env.PORT || config.port);
const HOST: string = process.env.IP || 'localhost';

// for logging errors (print to terminal)
app.use(morgan('dev'));

// ====================================================================
//  ================= WORK IS DONE BELOW THIS LINE ===================
// ====================================================================

app.use('/image', express.static('image'));
app.use('/csv', express.static('csv'));

// Example get request: Echo

app.get('/echo', (req: Request, res: Response) => {
  const data = req.query.echo as string;
  return res.json(echo(data));
});

// ====================== Iter2 (Using iter1) =========================

// adminAuthRegister Route
app.post('/v1/admin/auth/register', (req: Request, res: Response) => {
  const result = adminAuthRegister(
    req.body.email,
    req.body.password,
    req.body.nameFirst,
    req.body.nameLast
  );
  if ('error' in result) {
    if (result.error === 'Email address is used by another user') {
      res.status(400);
    } else if (result.error === 'Email does not satisfy validator') {
      res.status(400);
    } else if (result.error === 'NameFirst contains characters other than lowercase letters, uppercase letters, spaces, hyphens, or apostrophes') {
      res.status(400);
    } else if (result.error === 'NameFirst is less than 2 characters or more than 20 characters') {
      res.status(400);
    } else if (result.error === 'NameLast contains characters other than lowercase letters, uppercase letters, spaces, hyphens, or apostrophes') {
      res.status(400);
    } else if (result.error === 'NameLast is less than 2 characters or more than 20 characters') {
      res.status(400);
    } else if (result.error === 'Password is less than 8 characters') {
      res.status(400);
    } else if (result.error === 'Password does not contain at least one number and at least one letter') {
      res.status(400);
    }
  }
  return res.json(result);
});

// adminAuthLogin Route
app.post('/v1/admin/auth/login', (req: Request, res: Response) => {
  const result = adminAuthLogin(req.body.email, req.body.password);
  if ('error' in result) {
    if (result.error === 'Email address does not exist') {
      res.status(400);
    } else if (result.error === 'Password is not correct for the given email') {
      res.status(400);
    }
  }
  return res.json(result);
});

// adminUserDetails Route
app.get('/v1/admin/user/details', (req: Request, res: Response) => {
  const token = req.query.token as string;
  const result = adminUserDetails(token);
  if ('error' in result) {
    if (result.error === 'Token is not a valid structure') {
      res.status(401);
    } else if (result.error === 'Provided token is valid structure, but is not for a currently logged in session') {
      res.status(403);
    }
  }
  return res.json(result);
});

// adminQuizList Route
app.get('/v1/admin/quiz/list', (req: Request, res: Response) => {
  const token = req.query.token as string;
  const result = adminQuizList(token);
  if ('error' in result) {
    if (result.error === 'Token is not a valid structure') {
      res.status(401);
    } else if (
      result.error === 'Provided token is valid structure, but is not for a currently logged in session'
    ) {
      res.status(403);
    }
  }
  return res.json(result);
});

// adminQuizCreate Route
app.post('/v1/admin/quiz', (req: Request, res: Response) => {
  // const data = req.query.token as string;
  const result = adminQuizCreate(
    req.body.token,
    req.body.name,
    req.body.description
  );
  if ('error' in result) {
    if (result.error === 'Token is not a valid structure') {
      res.status(401);
    } else if (result.error === 'Provided token is valid structure, but is not for a currently logged in session') {
      res.status(403);
    } else if (result.error === 'Name contains invalid characters. Valid characters are alphanumeric and spaces') {
      res.status(400);
    } else if (result.error === 'Name is either less than 3 characters long or more than 30 characters long') {
      res.status(400);
    } else if (result.error === 'Name is already used by the current logged in user for another quiz') {
      res.status(400);
    } else if (result.error === 'Description is more than 100 characters in length (note: empty strings are OK)') {
      res.status(400);
    }
  }
  return res.json(result);
});

// adminQuizTrashView Route
app.get('/v1/admin/quiz/trash', (req: Request, res: Response) => {
  const data = req.query.token as string;
  const result = adminQuizTrashView(data);
  if ('error' in result) {
    if (result.error === 'Token is not a valid structure') {
      res.status(401);
    } else if (result.error === 'Provided token is valid structure, but is not for a currently logged in session') {
      res.status(403);
    }
  }
  return res.json(result);
});

// adminQuizRemove Route
app.delete('/v1/admin/quiz/:quizid', (req: Request, res: Response) => {
  const data = req.query.token as string; // query
  const result = adminQuizRemove(data, parseInt(req.params.quizid));
  if ('error' in result) {
    if (result.error === 'Token is not a valid structure') {
      res.status(401);
    } else if (result.error === 'Provided token is valid structure, but is not for a currently logged in session') {
      res.status(403);
    } else if (result.error === 'Quiz ID does not refer to a valid quiz') {
      res.status(400);
    } else if (result.error === 'Quiz ID does not refer to a quiz that this user owns') {
      res.status(400);
    }
  }
  return res.json(result);
});

// adminQuizInfo Route
app.get('/v1/admin/quiz/:quizid', (req: Request, res: Response) => {
  const data = req.query.token as string;
  const quizId = parseInt(req.params.quizid);
  const result = adminQuizInfo(data, quizId);
  if ('error' in result) {
    if (result.error === 'Token is not a valid structure') {
      res.status(401);
    } else if (result.error === 'Provided token is valid structure, but is not for a currently logged in session') {
      res.status(403);
    } else if (result.error === 'Quiz ID does not refer to a valid quiz') {
      res.status(400);
    } else if (result.error === 'Quiz ID does not refer to a quiz that this user owns') {
      res.status(400);
    }
  }
  return res.json(result);
});

// adminQuizNameUpdate Route
app.put('/v1/admin/quiz/:quizid/name', (req: Request, res: Response) => {
  const data = req.body.token as string;
  const name = req.body.name as string;
  const quizId = parseInt(req.params.quizid);
  const result = adminQuizNameUpdate(data, quizId, name);
  if ('error' in result) {
    if (result.error === 'Token is not a valid structure') {
      res.status(401);
    } else if (result.error === 'Provided token is valid structure, but is not for a currently logged in session') {
      res.status(403);
    } else if (result.error === 'Quiz ID does not refer to a valid quiz') {
      res.status(400);
    } else if (result.error === 'Quiz ID does not refer to a quiz that this user owns') {
      res.status(400);
    } else if (result.error === 'Name contains invalid characters. Valid characters are alphanumeric and spaces') {
      res.status(400);
    } else if (result.error === 'Name is either less than 3 characters long or more than 30 characters long') {
      res.status(400);
    } else if (result.error === 'Name is already used by the current logged in user for another quiz') {
      res.status(400);
    }
  }
  return res.json(result);
});

// adminQuizDescriptionUpdate Route
app.put('/v1/admin/quiz/:quizid/description', (req: Request, res: Response) => {
  const result = adminQuizDescriptionUpdate(
    parseInt(req.params.quizid),
    req.body.token,
    req.body.description
  );
  if ('error' in result) {
    if (result.error === 'Token is not a valid structure') {
      res.status(401);
    } else if (result.error === 'Provided token is valid structure, but is not for a currently logged in session') {
      res.status(403);
    } else if (result.error === 'Quiz ID does not refer to a valid quiz') {
      res.status(400);
    } else if (result.error === 'Quiz ID does not refer to a quiz that this user owns') {
      res.status(400);
    } else if (result.error === 'Description is more than 100 characters in length (note: empty strings are OK)') {
      res.status(400);
    }
  }
  return res.json(result);
});

// clear Route
app.delete('/v1/clear', (req: Request, res: Response) => {
  res.status(200).json(clear());
});

// ========================= Iter2 (New) =============================

// adminAuthLogout Route
app.post('/v1/admin/auth/logout', (req: Request, res: Response) => {
  const result = adminAuthLogout(req.body.token);
  if ('error' in result) {
    if (result.error === 'Token is not a valid structure') {
      res.status(401);
    } else if (result.error === 'This token is for a user who has already logged out') {
      res.status(400);
    }
  }
  return res.json(result);
});

// adminUserDetailsUpdate Route
app.put('/v1/admin/user/details', (req: Request, res: Response) => {
  const result = adminUserDetailsUpdate(
    req.body.token,
    req.body.email,
    req.body.nameFirst,
    req.body.nameLast
  );
  if ('error' in result) {
    if (result.error === 'Token is not a valid structure') {
      res.status(401);
    } else if (result.error === 'Provided token is valid structure, but is not for a currently logged in session') {
      res.status(403);
    } else if (result.error === 'Email is currently used by another user (excluding the current authorised user)') {
      res.status(400);
    } else if (result.error === 'Email does not satisfy validator') {
      res.status(400);
    } else if (result.error === 'NameFirst contains characters other than lowercase letters, uppercase letters, spaces, hyphens, or apostrophes') {
      res.status(400);
    } else if (result.error === 'NameFirst is less than 2 characters or more than 20 characters') {
      res.status(400);
    } else if (result.error === 'NameLast contains characters other than lowercase letters, uppercase letters, spaces, hyphens, or apostrophes') {
      res.status(400);
    } else if (result.error === 'NameLast is less than 2 characters or more than 20 characters') {
      res.status(400);
    }
  }
  return res.json(result);
});

// adminUserPasswordUpdate Route
app.put('/v1/admin/user/password', (req: Request, res: Response) => {
  const result = adminUserPasswordUpdate(
    req.body.token,
    req.body.oldPassword,
    req.body.newPassword
  );
  if ('error' in result) {
    if (result.error === 'Token is not a valid structure') {
      res.status(401);
    } else if (result.error === 'Provided token is valid structure, but is not for a currently logged in session') {
      res.status(403);
    } else if (result.error === 'Old Password is not the correct old password') {
      res.status(400);
    } else if (result.error === 'New Password has already been used before by this user') {
      res.status(400);
    } else if (result.error === 'Old Password and New Password match exactly') {
      res.status(400);
    } else if (result.error === 'New Password is less than 8 characters') {
      res.status(400);
    } else if (result.error === 'New Password does not contain at least one number and at least one letter') {
      res.status(400);
    }
  }
  return res.json(result);
});

// adminQuizRestore Route
app.post('/v1/admin/quiz/:quizid/restore', (req: Request, res: Response) => {
  const result = adminQuizRestore(parseInt(req.params.quizid), req.body.token);
  if ('error' in result) {
    if (result.error === 'Token is not a valid structure') {
      res.status(401);
    } else if (result.error === 'Provided token is valid structure, but is not for a currently logged in session') {
      res.status(403);
    } else if (result.error === 'Quiz ID does not refer to a valid quiz') {
      res.status(400);
    } else if (result.error === 'Quiz ID does not refer to a quiz that this user owns') {
      res.status(400);
    } else if (result.error === 'Quiz ID refers to a quiz that is not currently in the trash') {
      res.status(400);
    }
  }
  return res.json(result);
});

// adminQuizTrashEmpty Route
app.delete('/v1/admin/quiz/trash/empty', (req: Request, res: Response) => {
  const token = req.query.token as string;
  const quizIds = req.query.quizIds as string[];
  const quizIdsADD = [];
  for (const quizId of quizIds) {
    quizIdsADD.push(parseInt(quizId));
  }
  const result = adminQuizTrashEmpty(token, quizIdsADD);
  if ('error' in result) {
    if (result.error === 'Token is not a valid structure') {
      res.status(401);
    } else if (result.error === 'Provided token is valid structure, but is not for a currently logged in session') {
      res.status(403);
    } else if (result.error === 'One or more of the Quiz IDs is not a valid quiz') {
      res.status(400);
    } else if (result.error === 'One or more of the Quiz IDs refers to a quiz that this current user does not own') {
      res.status(400);
    } else if (result.error === 'One or more of the Quiz IDs is not currently in the trash') {
      res.status(400);
    }
  }
  return res.json(result);
});

// adminQuizTransfer Route
app.post('/v1/admin/quiz/:quizid/transfer', (req: Request, res: Response) => {
  const result = adminQuizTransfer(parseInt(req.params.quizid), req.body.token, req.body.userEmail);
  if ('error' in result) {
    if (result.error === 'Token is not a valid structure') {
      res.status(401);
    } else if (result.error === 'Provided token is valid structure, but is not for a currently logged in session') {
      res.status(403);
    } else if (result.error === 'Quiz ID does not refer to a valid quiz') {
      res.status(400);
    } else if (result.error === 'Quiz ID does not refer to a quiz that this user owns') {
      res.status(400);
    } else if (result.error === 'userEmail is not a real user') {
      res.status(400);
    } else if (result.error === 'userEmail is the current logged in user') {
      res.status(400);
    } else if (result.error === 'Quiz ID refers to a quiz that has a name that is already used by the target user') {
      res.status(400);
    } else if (result.error === 'All sessions for this quiz must be in END state') {
      res.status(400);
    }
  }
  return res.json(result);
});

// adminQuizQuestionCreate Route
app.post('/v1/admin/quiz/:quizid/question', (req: Request, res: Response) => {
  const quizId = parseInt(req.params.quizid);
  const token = req.body.token;
  const questionBody = req.body.questionBody;
  const result = adminQuizQuestionCreate(quizId, token, questionBody);
  if ('error' in result) {
    if (result.error === 'Token is not a valid structure') {
      res.status(401);
    } else if (result.error === 'Provided token is valid structure, but is not for a currently logged in session') {
      res.status(403);
    } else if (result.error === 'Quiz ID does not refer to a valid quiz') {
      res.status(400);
    } else if (result.error === 'Quiz ID does not refer to a quiz that this user owns') {
      res.status(400);
    } else if (result.error === 'Question string is less than 5 characters in length or greater than 50 characters in length') {
      res.status(400);
    } else if (result.error === 'The question has more than 6 answers or less than 2 answers') {
      res.status(400);
    } else if (result.error === 'The question duration is not a positive number') {
      res.status(400);
    } else if (result.error === 'The sum of the question durations in the quiz exceeds 3 minutes') {
      res.status(400);
    } else if (result.error === 'The points awarded for the question are less than 1 or greater than 10') {
      res.status(400);
    } else if (result.error === 'The length of any answer is shorter than 1 character long, or longer than 30 characters long') {
      res.status(400);
    } else if (result.error === 'Any answer strings are duplicates of one another (within the same question)') {
      res.status(400);
    } else if (result.error === 'There are no correct answers') {
      res.status(400);
    }
  }
  return res.json(result);
});

// adminQuizQuestionUpdate Route
app.put('/v1/admin/quiz/:quizid/question/:questionid', (req: Request, res: Response) => {
  const quizId = parseInt(req.params.quizid);
  const questionId = parseInt(req.params.questionid);
  const questionBody = req.body.questionBody;
  const token = req.body.token;
  const result = adminQuizQuestionUpdate(quizId, questionId, token, questionBody);
  if ('error' in result) {
    if (result.error === 'Token is not a valid structure') {
      res.status(401);
    } else if (result.error === 'Provided token is valid structure, but is not for a currently logged in session') {
      res.status(403);
    } else if (result.error === 'Quiz ID does not refer to a valid quiz') {
      res.status(400);
    } else if (result.error === 'Quiz ID does not refer to a quiz that this user owns') {
      res.status(400);
    } else if (result.error === 'Question Id does not refer to a valid question within this quiz') {
      res.status(400);
    } else if (result.error === 'Question string is less than 5 characters in length or greater than 50 characters in length') {
      res.status(400);
    } else if (result.error === 'The question has more than 6 answers or less than 2 answers') {
      res.status(400);
    } else if (result.error === 'The question duration is not a positive number') {
      res.status(400);
    } else if (result.error === 'If this question were to be updated, the sum of the question durations in the quiz exceeds 3 minutes') {
      res.status(400);
    } else if (result.error === 'The points awarded for the question are less than 1 or greater than 10') {
      res.status(400);
    } else if (result.error === 'The length of any answer is shorter than 1 character long, or longer than 30 characters long') {
      res.status(400);
    } else if (result.error === 'Any answer strings are duplicates of one another (within the same question)') {
      res.status(400);
    } else if (result.error === 'There are no correct answers') {
      res.status(400);
    }
  }
  return res.json(result);
});

// adminQuizQuestionRemove Route
app.delete('/v1/admin/quiz/:quizid/question/:questionid', (req: Request, res: Response) => {
  const token = req.query.token as string;
  const result = adminQuizQuestionRemove(parseInt(req.params.quizid), parseInt(req.params.questionid), token);
  if ('error' in result) {
    if (result.error === 'Token is not a valid structure') {
      res.status(401);
    } else if (result.error === 'Provided token is valid structure, but is not for a currently logged in session') {
      res.status(403);
    } else if (result.error === 'Quiz ID does not refer to a valid quiz') {
      res.status(400);
    } else if (result.error === 'Quiz ID does not refer to a quiz that this user owns') {
      res.status(400);
    } else if (result.error === 'Question Id does not refer to a valid question within this quiz') {
      res.status(400);
    } else if (result.error === 'All sessions for this quiz must be in END state') {
      res.status(400);
    }
  }
  return res.json(result);
});

// adminQuizQuestionMove Route
app.put('/v1/admin/quiz/:quizid/question/:questionid/move', (req: Request, res: Response) => {
  const quizId = parseInt(req.params.quizid);
  const questionId = parseInt(req.params.questionid);
  const token = req.body.token;
  const newPosition = req.body.newPosition;
  const result = adminQuizQuestionMove(quizId, questionId, token, newPosition);
  if ('error' in result) {
    if (result.error === 'Token is not a valid structure') {
      res.status(401);
    } else if (result.error === 'Provided token is valid structure, but is not for a currently logged in session') {
      res.status(403);
    } else if (result.error === 'Quiz ID does not refer to a valid quiz') {
      res.status(400);
    } else if (result.error === 'Quiz ID does not refer to a quiz that this user owns') {
      res.status(400);
    } else if (result.error === 'Question Id does not refer to a valid question within this quiz') {
      res.status(400);
    } else if (result.error === 'NewPosition is less than 0, or NewPosition is greater than n-1 where n is the number of questions') {
      res.status(400);
    } else if (result.error === 'NewPosition is the position of the current question') {
      res.status(400);
    }
  }
  return res.json(result);
});

// adminQuizQuestionDuplicate Route
app.post('/v1/admin/quiz/:quizid/question/:questionid/duplicate', (req: Request, res: Response) => {
  const quizId = parseInt(req.params.quizid);
  const questionId = parseInt(req.params.questionid);
  const data = req.body.token as string;
  const result = adminQuizQuestionDuplicate(data, quizId, questionId);
  if ('error' in result) {
    if (result.error === 'Token is not a valid structure') {
      res.status(401);
    } else if (result.error === 'Provided token is valid structure, but is not for a currently logged in session') {
      res.status(403);
    } else if (result.error === 'Quiz ID does not refer to a valid quiz') {
      res.status(400);
    } else if (result.error === 'Quiz ID does not refer to a quiz that this user owns') {
      res.status(400);
    } else if (result.error === 'Question Id does not refer to a valid question within this quiz') {
      res.status(400);
    }
  }
  return res.json(result);
});

// ========================= Iter3 (Modified) =============================

// adminAuthLogoutV2 Route
app.post('/v2/admin/auth/logout', (req: Request, res: Response) => {
  const token = req.header('token');
  const result = adminAuthLogoutV2(token);
  return res.json(result);
});

// adminUserDetailsV2 Route
app.get('/v2/admin/user/details', (req: Request, res: Response) => {
  const token = req.header('token');
  const result = adminUserDetailsV2(token);
  return res.json(result);
});

// adminUserDetailsUpdateV2 Route
app.put('/v2/admin/user/details', (req: Request, res: Response) => {
  const token = req.header('token');
  const result = adminUserDetailsUpdateV2(
    token,
    req.body.email,
    req.body.nameFirst,
    req.body.nameLast
  );
  return res.json(result);
});

// adminUserPasswordUpdateV2 Route
app.put('/v2/admin/user/password', (req: Request, res: Response) => {
  const token = req.header('token');
  const result = adminUserPasswordUpdateV2(
    token,
    req.body.oldPassword,
    req.body.newPassword
  );
  return res.json(result);
});

// adminQuizListV2 Route
app.get('/v2/admin/quiz/list', (req: Request, res: Response) => {
  const token = req.header('token');
  const result = adminQuizListV2(token);
  return res.json(result);
});

// adminQuizCreateV2 Route
app.post('/v2/admin/quiz', (req: Request, res: Response) => {
  const data = req.header('token');
  const result = adminQuizCreateV2(
    data,
    req.body.name,
    req.body.description
  );
  return res.json(result);
});

// adminQuizTrashViewV2 Route
app.get('/v2/admin/quiz/trash', (req: Request, res: Response) => {
  const token = req.header('token');
  const result = adminQuizTrashViewV2(token);
  return res.json(result);
});

// adminQuizRemoveV2 Route
app.delete('/v2/admin/quiz/:quizid', (req: Request, res: Response) => {
  const token = req.header('token');
  const result = adminQuizRemoveV2(token, parseInt(req.params.quizid));
  return res.json(result);
});

// adminQuizInfoV2 Route
app.get('/v2/admin/quiz/:quizid', (req: Request, res: Response) => {
  const token = req.header('token');
  const quizId = parseInt(req.params.quizid);
  const result = adminQuizInfoV2(token, quizId);
  return res.json(result);
});

// adminQuizNameUpdateV2 Route
app.put('/v2/admin/quiz/:quizid/name', (req: Request, res: Response) => {
  const token = req.header('token');
  const name = req.body.name as string;
  const quizId = parseInt(req.params.quizid);
  const result = adminQuizNameUpdateV2(token, quizId, name);
  return res.json(result);
});

// adminQuizDescriptionUpdateV2 Route
app.put('/v2/admin/quiz/:quizid/description', (req: Request, res: Response) => {
  const token = req.header('token');
  const result = adminQuizDescriptionUpdateV2(
    parseInt(req.params.quizid),
    token,
    req.body.description
  );
  return res.json(result);
});

// adminQuizRestoreV2 Route
app.post('/v2/admin/quiz/:quizid/restore', (req: Request, res: Response) => {
  const token = req.header('token');
  const result = adminQuizRestoreV2(parseInt(req.params.quizid), token);
  return res.json(result);
});

// adminQuizTrashEmptyV2 Route
app.delete('/v2/admin/quiz/trash/empty', (req: Request, res: Response) => {
  const token = req.header('token');
  const quizIds = req.query.quizIds as string[];
  const quizIdsADD = [];
  for (const quizId of quizIds) {
    quizIdsADD.push(parseInt(quizId));
  }
  const result = adminQuizTrashEmptyV2(token, quizIdsADD);
  return res.json(result);
});

// adminQuizTransferV2 Route
app.post('/v2/admin/quiz/:quizid/transfer', (req: Request, res: Response) => {
  const token = req.header('token');
  const result = adminQuizTransferV2(parseInt(req.params.quizid), token, req.body.userEmail);
  return res.json(result);
});

// adminQuizQuestionCreateV2 Route
app.post('/v2/admin/quiz/:quizid/question', (req: Request, res: Response) => {
  const token = req.header('token');
  const quizId = parseInt(req.params.quizid);
  const questionBody = req.body.questionBody;
  const result = adminQuizQuestionCreateV2(quizId, token, questionBody);
  return res.json(result);
});

// adminQuizQuestionUpdateV2 Route
app.put('/v2/admin/quiz/:quizid/question/:questionid', (req: Request, res: Response) => {
  const quizId = parseInt(req.params.quizid);
  const questionId = parseInt(req.params.questionid);
  const token = req.header('token');
  const questionBody = req.body.questionBody;
  const result = adminQuizQuestionUpdateV2(quizId, questionId, token, questionBody);
  return res.json(result);
});

// adminQuizQuestionRemoveV2 Route
app.delete('/v2/admin/quiz/:quizid/question/:questionid', (req: Request, res: Response) => {
  const quizId = parseInt(req.params.quizid);
  const questionId = parseInt(req.params.questionid);
  const token = req.header('token');
  const result = adminQuizQuestionRemoveV2(quizId, questionId, token);
  return res.json(result);
});

// adminQuizQuestionMoveV2 Route
app.put('/v2/admin/quiz/:quizid/question/:questionid/move', (req: Request, res: Response) => {
  const quizId = parseInt(req.params.quizid);
  const questionId = parseInt(req.params.questionid);
  const token = req.header('token');
  const newPosition = req.body.newPosition;
  const result = adminQuizQuestionMoveV2(quizId, questionId, token, newPosition);
  return res.json(result);
});

// adminQuizQuestionDuplicateV2 Route
app.post('/v2/admin/quiz/:quizid/question/:questionid/duplicate', (req: Request, res: Response) => {
  const quizId = parseInt(req.params.quizid);
  const questionId = parseInt(req.params.questionid);
  const token = req.header('token');
  const result = adminQuizQuestionDuplicateV2(quizId, questionId, token);
  return res.json(result);
});

// ========================= Iter3 (New) =============================

// adminQuizThumbnailUpdate Route
app.put('/v1/admin/quiz/:quizid/thumbnail', (req: Request, res: Response) => {
  const quizId = parseInt(req.params.quizid);
  const token = req.header('token');
  const imgUrl = req.body.imgUrl;
  const result = adminQuizThumbnailUpdate(quizId, token, imgUrl);
  return res.json(result);
});

// adminQuizSessionView Route
app.get('/v1/admin/quiz/:quizid/sessions', (req: Request, res: Response) => {
  const quizId = parseInt(req.params.quizid);
  const token = req.header('token');
  const result = adminQuizSessionView(token, quizId);
  return res.json(result);
});

// adminQuizSessionStart Route
app.post('/v1/admin/quiz/:quizid/session/start', (req: Request, res: Response) => {
  const quizId = parseInt(req.params.quizid);
  const token = req.header('token');
  const autoStartNum = req.body.autoStartNum;
  const result = adminQuizSessionStart(quizId, token, autoStartNum);
  return res.json(result);
});

// adminQuizSessionUpdate Route
app.put('/v1/admin/quiz/:quizid/session/:sessionid', (req: Request, res: Response) => {
  const quizId = parseInt(req.params.quizid);
  const sessionId = parseInt(req.params.sessionid);
  const token = req.header('token');
  const action = req.body.action;
  const result = adminQuizSessionUpdate(quizId, sessionId, token, action);
  return res.json(result);
});

// adminQuizSessionStatus Route
app.get('/v1/admin/quiz/:quizid/session/:sessionid', (req: Request, res: Response) => {
  const quizId = parseInt(req.params.quizid);
  const sessionId = parseInt(req.params.sessionid);
  const token = req.header('token');
  const result = adminQuizSessionStatus(quizId, sessionId, token);
  return res.json(result);
});

// adminQuizSessionResult Route
app.get('/v1/admin/quiz/:quizid/session/:sessionid/results', (req: Request, res: Response) => {
  const quizId = parseInt(req.params.quizid);
  const sessionId = parseInt(req.params.sessionid);
  const token = req.header('token');
  const result = adminQuizSessionResult(quizId, sessionId, token);
  return res.json(result);
});

// adminQuizSessionResultCSV Route
app.get('/v1/admin/quiz/:quizid/session/:sessionid/results/csv', (req: Request, res: Response) => {
  const quizId = parseInt(req.params.quizid);
  const sessionId = parseInt(req.params.sessionid);
  const token = req.header('token');
  const result = adminQuizSessionResultCSV(quizId, sessionId, token);
  return res.json(result);
});

// guestPlayerJoin Route
app.post('/v1/player/join', (req: Request, res: Response) => {
  const sessionId = req.body.sessionId;
  const name = req.body.name;
  const result = guestPlayerJoin(sessionId, name);
  return res.json(result);
});

// guestPlayerStatus Route
app.get('/v1/player/:playerid', (req: Request, res: Response) => {
  const playerId = parseInt(req.params.playerid);
  const result = guestPlayerStatus(playerId);
  return res.json(result);
});

// guestPlayerQuestionInfo Route
app.get('/v1/player/:playerid/question/:questionposition', (req: Request, res: Response) => {
  const playerId = parseInt(req.params.playerid);
  const questionposition = parseInt(req.params.questionposition);
  const result = guestPlayerQuestionInfo(playerId, questionposition);
  return res.json(result);
});

// guestPlayerAnswerSubmit Route
app.put('/v1/player/:playerid/question/:questionposition/answer', (req: Request, res: Response) => {
  const answerIds = req.body.answerIds;
  const playerId = parseInt(req.params.playerid);
  const questionposition = parseInt(req.params.questionposition);
  const result = guestPlayerAnswerSubmit(answerIds, playerId, questionposition);
  return res.json(result);
});

// guestPlayerResult Route
app.get('/v1/player/:playerid/question/:questionposition/results', (req: Request, res: Response) => {
  const playerId = parseInt(req.params.playerid);
  const questionposition = parseInt(req.params.questionposition);
  const result = guestPlayerResult(playerId, questionposition);
  return res.json(result);
});

// guestPlayerSessionResult Route
app.get('/v1/player/:playerid/results', (req: Request, res: Response) => {
  const playerId = parseInt(req.params.playerid);
  const result = guestPlayerSessionResult(playerId);
  return res.json(result);
});

// playerMessageSend Route
app.post('/v1/player/:playerid/chat', (req: Request, res: Response) => {
  const playerId = parseInt(req.params.playerid);
  const message = req.body.message;
  const result = playerMessageSend(playerId, message);
  return res.json(result);
});

// playerMessageView Route
app.get('/v1/player/:playerid/chat', (req: Request, res: Response) => {
  const playerId = parseInt(req.params.playerid);
  const result = playerMessageView(playerId);
  return res.json(result);
});
// ====================================================================
//  ================= WORK IS DONE ABOVE THIS LINE ===================
// ====================================================================

// For handling errors
app.use(errorHandler());

// start server
const server = app.listen(PORT, HOST, () => {
  // DO NOT CHANGE THIS LINE
  console.log(`⚡️ Server started on port ${PORT} at ${HOST}`);
});

// For coverage, handle Ctrl+C gracefully
process.on('SIGINT', () => {
  server.close(() => console.log('Shutting down server gracefully.'));
});

