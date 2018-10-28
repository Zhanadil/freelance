const express = require('express');
const path = require('path');
const config = require('config');
const router = express.Router();
const companyRouter = express.Router();
const studentRouter = express.Router();
const vacancyRouter = express.Router();
const questionnaireRouter = express.Router();

const Controller = require('@controllers/general');
const ProfileController = require('@controllers/profile');

// ***************************  Vacancies  *****************************

vacancyRouter.post('/ids/:page/:limit', Controller.getVacancyIds);

vacancyRouter.post('/:page/:limit', Controller.getVacancies);

vacancyRouter.get('/:id', Controller.getVacancyById);

router.use('/vacancy', vacancyRouter);

// ***************************  Companies  *****************************

companyRouter.get('/:id', Controller.getCompanyById);

// Gets avatar image from default directory.
companyRouter.use('/image-avatar',
    express.static(path.join(config.RESOURCES_DIRECTORY, '/avatar/company')));

// If no image was found, returns default image.
companyRouter.get('/image-avatar/*', function(req, res, next) {
    res.sendFile(path.join(config.RESOURCES_DIRECTORY, '/avatar/company/default_avatar.png'));
});


router.use('/company', companyRouter);

// ***************************  Students  *****************************

studentRouter.post('/ids/:page/:limit', Controller.getStudentIds);

studentRouter.post('/:page/:limit', Controller.getStudents);

studentRouter.get('/:id', Controller.getStudentById);

// Gets avatar image from default directory.
studentRouter.use('/image-avatar',
    express.static(path.join(config.RESOURCES_DIRECTORY, 'avatar/student')));

// If no image was found, returns default image.
studentRouter.get('/image-avatar/*', function(req, res, next) {
    res.sendFile(path.join(config.RESOURCES_DIRECTORY, '/avatar/student/default_avatar.png'));
});

router.use('/student', studentRouter);

// ***************************  Questionnaire  *****************************

questionnaireRouter.get('/question-set/:setNumber',
    Controller.getQuestionSet);

questionnaireRouter.get('/question-sets-info',
    Controller.getQuestionSetsInfo);

questionnaireRouter.get('/question-sets-info/:studentId',
    Controller.getQuestionSetsInfo);

questionnaireRouter.get('/all-question-sets',
    Controller.getAllQuestionSets);

questionnaireRouter.get('/answer/:studentId/:setNumber/:questionNumber',
    ProfileController.studentGetQuestionnaireAnswer);

questionnaireRouter.get('/set-answers/:studentId/:setNumber',
    ProfileController.studentGetQuestionnaireSetAnswers);

questionnaireRouter.get('/all-answers/:studentId',
    ProfileController.studentGetAllQuestionnaireAnswers);

router.use('/questionnaire', questionnaireRouter);

module.exports = router;
