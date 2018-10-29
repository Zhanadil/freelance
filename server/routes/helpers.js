const joi = require('joi');

const Questionnaire = require('@models/questionnaire');

const authSchema = joi.object().keys({
    email: joi.string().email({ minDomainAtoms: 2 }).required(),
    password: joi.string().required(),
});
const studentRegSchema = joi.object().keys({
    email: joi.string().email({ minDomainAtoms: 2 }).required(),
    password: joi.string().required(),
});
const companyRegSchema = studentRegSchema.keys({
    name: joi.string().required(),
});
const forgotPasswordSchema = joi.object().keys({
    email: joi.string().email({ minDomainAtoms: 2}).required(),
});
const resetPasswordSchema = joi.object().keys({
    password: joi.string().required(),
});
const newVacancySchema = joi.object().keys({
    description: joi.string().allow(""),
    demands: joi.array().items(joi.string()),
    cost: joi.number(),
    vacancyField: joi.string().required(),
    vacancyName: joi.string().required(),
    deadline: joi.date().min('now').required(),
});
const studentVacancyApplySchema = joi.object().keys({
    vacancyId: joi.string().required(),
    coverLetter: joi.string().allow(""),
    newCost: joi.number(),
});
const studentVacancyApplicationSchema = joi.object().keys({
    vacancyId: joi.string().required(),
});
const companyVacancyApplicationSchema = studentVacancyApplicationSchema.keys({
    studentId: joi.string().required()
});
const studentAnswerSchema = joi.object().keys({
    answers: joi.array().items(joi.string()),
});
const getVacancyById = joi.object().keys({
    requirements: joi.object().keys({
        description: joi.number(),
        demands: joi.number(),
        type: joi.number(),
        minSalary: joi.number(),
        maxSalary: joi.number(),
        vacancyField: joi.number(),
        vacancyName: joi.number(),
        companyId: joi.number(),
        companyName: joi.number(),
    }),
});
const getAllVacancies = getVacancyById.keys({
    filter: joi.object().keys({
        minSalary: joi.number(),
        maxSalary: joi.number(),
        type: joi.array().items(joi.string()),
        vacancyField: joi.string(),
    }),
});
const deleteQuestionSchema = joi.object().keys({
    setNumber: joi.number().min(0).required(),
    questionNumber: joi.number().min(0).required(),
});
const updateQuestionSchema = joi.object().keys({
    questionType: joi.string().valid(
        // Берет все типы вопросов со схемы вопросника в базе данных
        // QuestionSet('questions.questionType').enumValues
        Questionnaire.QuestionSet.schema.paths.questions.schema.paths.questionType.enumValues
    ).required(),
    setNumber: joi.number().min(0).required(),
    questionNumber: joi.number().min(0).required(),
    questionText: joi.string().required(),
    answers: joi.array().items(joi.string()).required(),
});
const updateBelbinQuestionSchema = joi.object().keys({
    setNumber: joi.number().min(0).required(),
    questionNumber: joi.number().min(0).required(),
    questions: joi.array().items(joi.string()).length(8).required(),
});
const createQuestionSetSchema = joi.object().keys({
    setNumber: joi.number().min(0).required(),
    setName: joi.string().required(),
    setType: joi.string().required(),
});
const deleteQuestionSetSchema = joi.object().keys({
    setNumber: joi.number().min(0).required(),
});
const updateQuestionSetSchema = joi.object().keys({
    setNumber: joi.number().min(0).required(),
    setName: joi.string(),
    setType: joi.string().valid(
        // Берет все типы вопросов со схемы вопросника в базе данных
        // QuestionSet('setType').enumValues
        Questionnaire.QuestionSet.schema.paths.setType.enumValues
    ),
});

const employeeSignupSchema = joi.object().keys({
    code: joi.string().required(),
    firstName: joi.string().required(),
    lastName: joi.string().required(),
    position: joi.string().required(),
    password: joi.string().required(),
});

module.exports = {
    // Helper that checks that request body corresponds to a schema
    validateBody: (schema) => {
        return (req, res, next) => {
            const result = joi.validate(req.body, schema);

            if (result.error) {
                return res.status(400).json(result.error);
            }

            if (!req.value) {
                req.value = {};
            }

            req.value['body'] = result.value;

            next();
        }
    },

    // Schemas used in validateBody function
    schemas: {
        authSchema,
        studentRegSchema,
        companyRegSchema,
        forgotPasswordSchema,
        resetPasswordSchema,
        newVacancySchema,
        studentVacancyApplySchema,
        studentVacancyApplicationSchema,
        companyVacancyApplicationSchema,
        studentAnswerSchema,
        getVacancyById,
        getAllVacancies,
        updateQuestionSchema,
        updateBelbinQuestionSchema,
        deleteQuestionSchema,
        createQuestionSetSchema,
        deleteQuestionSetSchema,
        updateQuestionSetSchema,
        employeeSignupSchema,
    },
};
