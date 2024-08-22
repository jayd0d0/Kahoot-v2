/**
 *Reset the state of the application back to the start.
 *
 *@param {{}} - empty object
 *@return {{}} - empty object
 */
import fs from 'fs';
import { setData, DataStore } from './dataStore';

const dataFilePath = 'data.json';

function clear() {
  const data: DataStore = {
    users: [],
    quizzes: [],
    userQuiz: [],
    tokens: [],
    quizInTrash: [],
    quizSessions: [],
    userPassword: [],
    players: [],
  };
  const jsonString = JSON.stringify(data);
  fs.writeFileSync(dataFilePath, jsonString);
  setData(data);

  return {};
}

export { clear };
