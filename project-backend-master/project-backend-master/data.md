```javascript
let data = {
    users: {
        authUserId: 1, //identifier for user, given after register
        userId: 1, //identifier for user
        name: 'abc def',  //user's name
        nameFirst: 'abc', //user's first name
        nameLast: 'def', //user's last name
        nameDisplay: 'ghi', //name user chose to display
        email: 'abcdef@student.unsw.edu.au', //user's email
        password: '123abc456def', //password for login
        passwordHint: 'number and letter', //hint for password
        numSuccessfulLogins: 3, //successful login times
        numFailedPasswordsSinceLastLogin: 1, //failed login times
        //information about quizzes that user attempted
        quizInfoAttempted: [
            {
                quizIdAttempted: 1, //attempted quiz id
                quizNameAttempted: 'FirstQuiz', //name of this quiz
                quizScoreAttempted: 50, //score of this quiz
                quizRankAttempted: 5, //rank in this quiz
                quizAttemptedTime: 1, //time spent in this quiz
            },
            {
                quizIdAttempted: 2,
                quizNameAttempted: 'SecondQuiz',
                quizScoreAttempted: 60,
                quizRankAttempted: 4,
                quizAttemptedTime: 1,
            },
            {
                quizIdAttempted: 3,
                quizNameAttempted: 'ThirdQuiz',
                quizScoreAttempted: 70,
                quizRankAttempted: 3,
                quizAttemptedTime: 1,
            },    
        ],
    };
    //information of all quizzes
    quizzes: {
        quiz: [
            {
                quizId: 1, //quiz id
                name: 'FirstQuiz', //quiz name
                session: '23t2' //quiz seesion
                coursecode: 'COMP1531' //course code of quiz
                //quiz description
                description: 'contain knowledge in week1',
                timeCreated: 1683125871, //quiz created time
                //quiz last modified time
                timeLastEdited: 1683125872,
                quizDate: 'DD/MM/YYYY', //quiz date
                quizScore: [50,60,70,80], //array of users' score
                numUserQuiz: 50, //user number who did the quiz
                //display first three usernames
                quizRank: ['A','B','C'],
                quizAveScore: 60, //average score of quiz
                quizPassRate: 0.6, //pass rate of the quiz
            },
            {
                quizId: 2,
                name: 'SecondQuiz',
                session: '23t2'
                coursecode: 'COMP1531'
                description: 'contain knowledge in week1',
                timeCreated: 1683125873,
                timeLastEdited: 1683125874,
                quizDate: 'DD/MM/YYYY',
                quizScore: [50,60,70,80],
                numUserQuiz: 50,
                quizRank: ['A','B','C'],
                quizAveScore: 60, 
                quizPassRate: 0.6,
            },
            {
                quizId: 3,
                name: 'ThirdQuiz',
                session: '23t2'
                coursecode: 'COMP1531'
                description: 'contain knowledge in week1',
                timeCreated: 1683125875,
                timeLastEdited: 1683125876,
                quizDate: 'DD/MM/YYYY',
                quizScore: [50,60,70,80],
                numUserQuiz: 50,
                quizRank: ['A','B','C'],
                quizAveScore: 60, 
                quizPassRate: 0.6,
            },
            {
                quizId: 4,
                name: 'FourthQuiz',
                session: '23t2'
                coursecode: 'COMP1531'
                description: 'contain knowledge in week1',
                timeCreated: 1683125877,
                timeLastEdited: 1683125878,
                quizDate: 'DD/MM/YYYY',
                quizScore: [50,60,70,80],
                numUserQuiz: 50,
                quizRank: ['A','B','C'],
                quizAveScore: 60, 
                quizPassRate: 0.6,
            },

        ],
        
        
    };
    // TODO: insert your data structure that contains 
    // users + quizzes here
};
```

[Optional] short description: 
The code define a JS object named 'data' with 'user' and 'quiz'.
The keys in user record user's personal info and account info,
and also the quiz info of the quizzes user attempted.
The keys in quiz record all quiz info including id,name,description,time,rank,score, user number and calculated ave score and pass rate.
