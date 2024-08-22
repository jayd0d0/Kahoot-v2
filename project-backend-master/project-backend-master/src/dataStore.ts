import fs from 'fs';
// YOU SHOULD MODIFY THIS OBJECT BELOW
export enum Actions {
  NEXT_QUESTION = 'NEXT_QUESTION',
  GO_TO_ANSWER = 'GO_TO_ANSWER',
  GO_TO_FINAL_RESULTS = 'GO_TO_FINAL_RESULTS',
  END = 'END'
}

export enum States {
  LOBBY = 'LOBBY',
  QUESTION_COUNTDOWN = 'QUESTION_COUNTDOWN',
  QUESTION_OPEN = 'QUESTION_OPEN',
  QUESTION_CLOSE = 'QUESTION_CLOSE',
  ANSWER_SHOW = 'ANSWER_SHOW',
  FINAL_RESULTS = 'FINAL_RESULTS',
  END = 'END',
}

export interface User {
  userId: number;
  name: string;
  nameFirst: string;
  nameLast: string;
  email: string;
  password: string;
  numSuccessfulLogins: number;
  numFailedPasswordsSinceLastLogin: number;
}
export interface UserPassword {
  userId: number;
  passwordUsedBefore: string[];
}

interface UserQuiz {
  userId: number;
  quizId: number;
}

interface Answer {
  answerId: number;
  answer: string;
  colour: string;
  correct: boolean;
}

export interface Question {
  questionId: number;
  question: string;
  duration: number;
  points: number;
  answers: Answer[];
  thumbnailUrl?: string;
}

interface Quiz {
  quizId: number;
  name: string;
  timeCreated: number;
  timeLastEdited: number;
  description: string;
  numQuestions: number;
  questions: Question[]
  duration: number;
  thumbnailUrl?: string
}

interface Token {
  token: string;
  userId: number;
}

interface QuizInTrash {
  quizId: number;
  name: string;
  timeCreated: number;
  timeLastEdited: number;
  description: string;
  numQuestions: number;
  questions: Question[]
  duration: number;
  thumbnailUrl?: string
  userId: number;
}

export interface PlayerInfo {
  sessionId: number;
  playerId: number;
  playerName: string;
  currecntScore: number;
}

export interface PlayerAnswerTime {
  questionId: number;
  // UnixTimeStamp when question_open
  questionStartTime: number,
  // UnixTimeStamp when submission
  answerTime: number[],
}

interface QuestionCorrectBreakDown {
  answerId: number;
  playersCorrect: string[];
}

interface UsersRankedByScore {
  name: string;
  score: number;
}

export interface QuestionResult {
  questionId: number;
  questionCorrectBreakdown: QuestionCorrectBreakDown[];
  averageAnswerTime: number;
  percentCorrect: number;
}

export interface FinalResult {
  usersRankedByScore: UsersRankedByScore[];
  questionResults: QuestionResult[];
}

export interface PlayerMessage {
  messageBody: string;
  playerId: number;
  playerName: string;
  timeSent: number;
}

export interface QuizSession {
  sessionId: number;
  state: States;
  atQuestion: number;
  players: string[];
  quiz: Quiz;
  autoStartNum: number;
  playerNum: number;
  result: FinalResult;
  playersAnswerTime: PlayerAnswerTime[];
  playersMessage: PlayerMessage[];
}

export interface DataStore {
  users: User[];
  quizzes: Quiz[];
  userQuiz: UserQuiz[];
  tokens: Token[];
  quizInTrash: QuizInTrash[];
  quizSessions: QuizSession[];
  userPassword: UserPassword[];
  players: PlayerInfo[];
}

let data: DataStore = {
  users: [],
  quizzes: [],
  userQuiz: [],
  tokens: [],
  quizInTrash: [],
  quizSessions: [],
  userPassword: [],
  players: [],
};

// YOU SHOULDNT NEED TO MODIFY THE FUNCTIONS BELOW IN ITERATION 1

/*
Example usage
    let store = getData()
    console.log(store) # Prints { 'names': ['Hayden', 'Tam', 'Rani', 'Giuliana', 'Rando'] }

    names = store.names

    names.pop()
    names.push('Jake')

    console.log(store) # Prints { 'names': ['Hayden', 'Tam', 'Rani', 'Giuliana', 'Jake'] }
    setData(store)
*/

// Use get() to access the data
export function getData() {
  const json = fs.readFileSync('data.json');
  const dataString = json.toString();
  return JSON.parse(dataString) as DataStore;
}

// Use set(newData) to pass in the entire data object, with modifications made
export function setData(newData: DataStore) {
  data = newData;
  const jsonString = JSON.stringify(newData);
  fs.writeFileSync('data.json', jsonString);
}
