const express = require('express');
const path = require('path');
const config = require('config');
const router = express.Router();
const authRouter = express.Router();
const privateRouter = express.Router();
const vacancyRouter = express.Router();
const questionnaireRouter = express.Router();
const chatRouter = express.Router();

const passport = require('passport');
const passportConfig = require('@root/passport');
const { validateBody, schemas } = require('@routes/helpers');

const AuthController = require('@controllers/auth');
const ProfileController = require('@controllers/profile');
const VacancyController = require('@controllers/vacancy');
const ChatController = require('@controllers/chat');
const StorageController = require('@controllers/storage');

// ***********  All student authorization related requests  *****************

authRouter.post('/signup',
    validateBody(schemas.studentRegSchema),
    AuthController.studentSignUp);

authRouter.get('/verify/:token', AuthController.studentVerify);

authRouter.get('/resend-verification',
    passport.authorize('jwt-student', { session: false }),
    AuthController.studentResendVerification);

authRouter.post('/signin',
    validateBody(schemas.authSchema),
    passport.authorize('local-student', {session: false}),
    AuthController.studentSignIn);

authRouter.post('/forgot-password',
    validateBody(schemas.forgotPasswordSchema),
    AuthController.studentSendForgotPasswordLink);

authRouter.get('/confirm-forgot-password/:url',
    AuthController.studentForgotPasswordConfirmation);

authRouter.post('/update-password/:url',
    validateBody(schemas.resetPasswordSchema),
    AuthController.studentChangePassword);

authRouter.post('/google',
    passport.authorize('googleToken-student', {session: false}),
    AuthController.studentGoogleOAuth);

router.use('/auth', authRouter);

// ********************  All Getters and Setters  *************************

// Only authorized students can make these requests.
privateRouter.use(passport.authenticate('jwt-student', {session: false}));

// Update student's first name and get student's first name by id.
privateRouter.route('/firstName')
    .post(ProfileController.studentUpdateFirstName)
    .get(ProfileController.studentGetFirstName);

// same.
privateRouter.route('/lastName')
    .post(ProfileController.studentUpdateLastName)
    .get(ProfileController.studentGetLastName);

privateRouter.route('/phone')
    .post(ProfileController.studentUpdatePhone)
    .get(ProfileController.studentGetPhone);

privateRouter.route('/description')
    .post(ProfileController.studentUpdateDescription)
    .get(ProfileController.studentGetDescription);

// Get full profile information.
privateRouter.get('/profile', ProfileController.studentGetFullProfile);

// Get profile information based on request:
// Input example:
//      {"id": true, "email": true}
// Output:
//      {"id": "... company id ...", "email": "johndoe@hotmail.com"}
privateRouter.post('/profile', ProfileController.studentGetProfile);

// Update profile information
// Input example:
//      {"email": "some_email@gmail.com", "firstName": "John"}
privateRouter.post('/update-profile', ProfileController.studentUpdateProfile);


// Puts avatar image to default directory(it's inside config folder, name=RESOURCES_DIRECTORY)
privateRouter.post('/image-avatar',
    ProfileController.studentUpdateImage(path.join(config.RESOURCES_DIRECTORY, 'avatar/student')));

privateRouter.put('/document',
    StorageController.limitFileSize(5000000), // Лимит 5МБ
    StorageController.uploadDocument('student')
);

privateRouter.delete('/document/:id',
    StorageController.removeDocument
);

privateRouter.get('/documents',
    StorageController.getDocuments('student')
);

router.use('/private', privateRouter);

// ***************************  Vacancies  ********************************

vacancyRouter.use(passport.authorize('jwt-student', {session: false}));

vacancyRouter.post('/apply',
    validateBody(schemas.studentVacancyApplySchema),
    VacancyController.studentApplication);

vacancyRouter.post('/cancel',
    validateBody(schemas.studentVacancyApplicationSchema),
    VacancyController.changeStatus(VacancyController.statusRequirements.studentCancel, "canceled"));

vacancyRouter.post('/accept',
    validateBody(schemas.studentVacancyApplicationSchema),
    VacancyController.freelancerAcceptApplication);

vacancyRouter.post('/reject',
    validateBody(schemas.studentVacancyApplicationSchema),
    VacancyController.changeStatus(VacancyController.statusRequirements.studentReject, "rejected"));

vacancyRouter.post('/discard',
    validateBody(schemas.studentVacancyApplicationSchema),
    VacancyController.studentDiscardApplication);

vacancyRouter.post('/:page/:limit',
    validateBody(schemas.getAllVacancies),
    VacancyController.getAllVacanciesAsStudent);

vacancyRouter.route('/getApplications')
    .get(VacancyController.getStudentApplications)
    .post(VacancyController.getStudentApplications);

vacancyRouter.post('/:id',
    validateBody(schemas.getVacancyById),
    VacancyController.getVacancyByIdAsStudent);

vacancyRouter.get('/ongoing', VacancyController.freelancerOngoingTasks);

router.use('/vacancy', vacancyRouter);

// ***************************  Questionnaire  ********************************

questionnaireRouter.use(passport.authorize('jwt-student', {session: false}));

questionnaireRouter.post('/answer/:setNumber/:questionNumber',
    validateBody(schemas.studentAnswerSchema),
    ProfileController.studentUpdateQuestionnaireAnswer);

questionnaireRouter.get('/question-set/:setNumber',
    ProfileController.studentGetQuestionSet);

questionnaireRouter.get('/all-question-sets',
    ProfileController.studentGetAllQuestionSets);

router.use('/questionnaire', questionnaireRouter);

// ******************************** Chat **************************************

chatRouter.use(passport.authorize('jwt-student', { session: false }));

chatRouter.get('/last-message/:conversationId', ChatController.studentGetLastChatMessage);

chatRouter.get('/:conversationId/:cursor/:limit', ChatController.studentGetChat);

chatRouter.get('/conversations', ChatController.studentConversations);

router.use('/chat', chatRouter);

module.exports = router;
