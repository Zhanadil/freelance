const express = require('express');
const fs = require('fs');
const config = require('config');
const path = require('path');
const router = express.Router();
const authRouter = express.Router();
const privateRouter = express.Router();
const vacancyRouter = express.Router();
const chatRouter = express.Router();
const employeeRouter = express.Router();

const passport = require('passport');
const passportConfig = require('@root/passport');
const { validateBody, schemas } = require('@routes/helpers');

const AuthController = require('@controllers/auth');
const ProfileController = require('@controllers/profile');
const VacancyController = require('@controllers/vacancy');
const ChatController = require('@controllers/chat');
const StorageController = require('@controllers/storage');
const EmployeeController = require('@controllers/employee');

// **************  All company authorization related requests ****************

authRouter.post('/signup',
    validateBody(schemas.companyRegSchema),
    AuthController.companySignUp);

authRouter.get('/verify/:token', AuthController.companyVerify);

authRouter.get('/resend-verification',
    passport.authorize('jwt-company', { session: false }),
    AuthController.companyResendVerification);

authRouter.post('/signin',
    validateBody(schemas.authSchema),
    passport.authorize('local-company', {session: false}),
    AuthController.companySignIn);

authRouter.post('/forgot-password',
    validateBody(schemas.forgotPasswordSchema),
    AuthController.companySendForgotPasswordLink);

authRouter.get('/confirm-forgot-password/:url',
    AuthController.companyForgotPasswordConfirmation);

authRouter.post('/update-password/:url',
    validateBody(schemas.resetPasswordSchema),
    AuthController.companyChangePassword);

router.use('/auth', authRouter);

// *************************  All Getters and Setters ***********************

privateRouter.use(passport.authenticate('jwt-company', {session: false}));

// Update company name and get company name by id.
privateRouter.route('/name')
    .put(ProfileController.companyUpdateName)
    .get(ProfileController.companyGetName);

// .. so on ...
privateRouter.route('/phone')
    .put(ProfileController.companyUpdatePhone)
    .get(ProfileController.companyGetPhone);

privateRouter.route('/description')
    .put(ProfileController.companyUpdateDescription)
    .get(ProfileController.companyGetDescription);

// get full profile information.
privateRouter.get('/profile', ProfileController.companyGetFullProfile);

// Get profile information based on request:
// Input example:
//      {"id": true, "email": true}
// Output:
//      {"id": "... company id ...", "email": "johndoe@hotmail.com"}
privateRouter.post('/profile', ProfileController.companyGetProfile);

// Update profile information
// Input example:
//      {"email": "some_email@gmail.com", "firstName": "John"}
privateRouter.post('/update-profile', ProfileController.companyUpdateProfile);

// Puts avatar image to default directory(it's inside config folder, name=RESOURCES_DIRECTORY)
privateRouter.post('/image-avatar',
    ProfileController.companyUpdateImage(path.join(config.RESOURCES_DIRECTORY, 'avatar/company')));

privateRouter.post('/document',
    StorageController.limitFileSize(5000000), // Лимит 5МБ
    StorageController.uploadDocument('company')
);

privateRouter.delete('/document/:id',
    StorageController.removeDocument
);

privateRouter.get('/documents',
    StorageController.getDocuments('company')
);

router.use('/private', privateRouter);

// ***************************  Vacancies  *********************************

vacancyRouter.use(
    passport.authorize('jwt-company', {session: false})
);

vacancyRouter.route('/')
    .put(
        validateBody(schemas.newVacancySchema),
        VacancyController.newVacancy
    )
    .get(
        VacancyController.getCompanyVacancies
    );

vacancyRouter.post('/apply',
    validateBody(schemas.companyVacancyApplicationSchema),
    VacancyController.companyApplication);

vacancyRouter.post('/cancel',
    validateBody(schemas.companyVacancyApplicationSchema),
    VacancyController.companyCancelApplication);

vacancyRouter.post('/accept',
    validateBody(schemas.companyVacancyApplicationSchema),
    VacancyController.companyAcceptApplication);

vacancyRouter.post('/reject',
    validateBody(schemas.companyVacancyApplicationSchema),
    VacancyController.changeStatus(VacancyController.statusRequirements.companyReject, "rejected"));

vacancyRouter.post('/discard',
    validateBody(schemas.companyVacancyApplicationSchema),
    VacancyController.companyDiscardApplication);

vacancyRouter.post('/revoke',
    validateBody(schemas.companyRevokeApplicationSchema),
    VacancyController.companyRevokeApplication
);

vacancyRouter.get('/remove/:id', VacancyController.removeVacancy);

vacancyRouter.route('/getApplications')
    .get(VacancyController.getCompanyApplications)
    .post(VacancyController.getCompanyApplications);

vacancyRouter.get('/ongoing', VacancyController.companyOngoingTasks);

router.use('/vacancy', vacancyRouter);

// ******************************** Chat **************************************

chatRouter.use(passport.authorize('jwt-company', { session: false }));

chatRouter.get('/last-message/:conversationId', ChatController.companyGetLastChatMessage);

chatRouter.get('/:conversationId/:cursor/:limit', ChatController.companyGetChat);

chatRouter.get('/conversations', ChatController.companyConversations);

router.use('/chat', chatRouter);

// ******************************** Employee **********************************

employeeRouter.get('/verify/:code', EmployeeController.newEmployeeCodeConfirmation);

employeeRouter.post('/signup',
    validateBody(schemas.employeeSignupSchema),
    EmployeeController.newEmployeeSignUp
);

employeeRouter.use(passport.authenticate('jwt-company', { session: false }));

employeeRouter.put('/', EmployeeController.newEmployee);

employeeRouter.put('/resend', EmployeeController.resendEmployeeVerification);

employeeRouter.get('/all', EmployeeController.allEmployees);

router.use('/employee', employeeRouter);

module.exports = router;
