1: We can assume that two users can't register at the same time as it may cause the two users to have the same ID, hence making Id not being unique anymore.

2: We can assume that two people can't create a quiz at the same time.

3: There can be an infinite number of users - although it may slow down the operation of toohak platform.

4: We can assume that the time we created quiz, is the time we last edited quiz (since there is no other function relating to editing of the quiz). 

5: Users dont need to login to modify and search the datastore (e.g creating or editing quizzes) - they just need to register to get an AuthUserId. 

6: Two people with the same first name, last name, and password (not email) can register.
