const express = require('express');
const path = require('path');
const config = require('config');
const router = express.Router();
const questionnaireRouter = express.Router();

const passport = require('passport');
const passportConfig = require('@root/passport');
const { validateBody, schemas } = require('@routes/helpers');

const AdminController = require('@controllers/admin.js');

// ***************************  Questionnaire  *****************************

questionnaireRouter.use(passport.authorize('jwt-admin', {session: false}));

questionnaireRouter.route('/question')
    .put(
        validateBody(schemas.updateQuestionSchema),
        AdminController.updateQuestion
    )
    .delete(
        validateBody(schemas.deleteQuestionSchema),
        AdminController.deleteQuestion
    );

questionnaireRouter.put('/question-belbin',
    validateBody(schemas.updateBelbinQuestionSchema),
    AdminController.updateBelbinQuestion);

questionnaireRouter.route('/set')
    .put(
        validateBody(schemas.createQuestionSetSchema),
        AdminController.createQuestionSet
    )
    .post(
        validateBody(schemas.updateQuestionSetSchema),
        AdminController.updateQuestionSet
    )
    .delete(
        validateBody(schemas.deleteQuestionSetSchema),
        AdminController.deleteQuestionSet
    );

router.use('/questionnaire', questionnaireRouter);

module.exports = router;
