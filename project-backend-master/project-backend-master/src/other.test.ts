import request from 'sync-request';
import config from './config.json';

const port = config.port;
const url = config.url;

describe('HTTP testing for clear function', () => {
  test('Successful clear', () => {
    const resRegister = request(
      'POST',
      `${url}:${port}/v1/admin/auth/register`,
      {
        json: {
          email: 'rishabh@unsw.edu.au',
          password: 'ABCDE12345',
          nameFirst: 'Rishabh',
          nameLast: 'Alajpur',
        },
        timeout: 100
      }
    );

    const user = JSON.parse(resRegister.body.toString());

    const resQuiz1 = request(
      'POST',
      `${url}:${port}/v1/admin/quiz`,
      {
        json: {
          token: user.token,
          name: 'My first quiz',
          description: 'Something super random',
        },
        timeout: 100
      }
    );

    const quiz1 = JSON.parse(resQuiz1.body.toString());
    const quizId1 = quiz1.quizId;

    request(
      'POST',
      `${url}:${port}/v1/admin/quiz`,
      {
        json: {
          token: user.token,
          name: 'My second quiz',
          description: 'Something super random',
        },
        timeout: 100
      }
    );

    request(
      'DELETE',
      `${url}:${port}/v1/admin/quiz/${quizId1}`,
      {
        qs: {
          token: user.token,
        },
        timeout: 100
      }
    );

    const res = request(
      'DELETE',
      `${url}:${port}/v1/clear`,
      {
        qs: {},
      }
    );

    const result = JSON.parse(res.body.toString());
    expect(result).toEqual({});
    expect(res.statusCode).toBe(200);
  });
});
