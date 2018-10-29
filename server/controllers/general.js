const to = require('await-to-js').default;

const { Company } = require('@models/company');
const Student = require('@models/student');
const { Vacancy } = require('@models/vacancy');
const Questionnaire = require('@models/questionnaire');
const helpers = require('@controllers/helpers');

// Setting up filters based on request
filterOut = function(filter) {
    if (filter === undefined) {
        return {};
    }
    var result = {};
    if (filter.minSalary !== undefined) {
        result.maxSalary = {'$gte': filter.minSalary};
    }
    if (filter.maxSalary !== undefined) {
        result.minSalary = {'$lte': filter.maxSalary};
    }
    if (filter.type !== undefined) {
        result.type = {'$in': filter.type};
    }
    if (filter.vacancyField !== undefined) {
        result.vacancyField = filter.vacancyField;
    }
    return result;
}

// Public controller functions that gets, but not changes all public information.
module.exports = {
    // /company/:id
    // returns company by id.
    // request contains requirements that output should match,
    // like show only name, description and email

    // example: /company/5b6cc829e3956907dc4532cd
    getCompanyById: (req, res, next) => {
        Company.findById(req.params.id, { 'credentials.password': 0 }, (err, company) => {
            if (err) {
                return res.status(500).json(err);
            }
            return res.status(200).json(company);
        });
    },

    // /student/ids/:page/:limit
    // :limit = number of vacancies per page
    // :page = page number starting from 0

    // returns ids of students that should be rendered on the page.

    // example: /student/ids/1/10
    // get students on the 2nd page with 10 entries per page
    getStudentIds: async (req, res, next) => {
        var filter = {};
        // Setting up filters based on request
        if (req.body.filter !== undefined) {
            // TODO: set up filters
        }

        Student.find(filter, {'_id': 1})
            .sort({'_id': -1})
            .skip(req.params.page*req.params.limit)
            .limit(parseInt(req.params.limit))
            .exec((err, students) => {
                res.status(200).json(students.map(x => x._id));
            });
    },

    // /student/:page/:limit
    // :limit = number of vacancies per page
    // :page = page number starting from 0

    // returns students that should be rendered on the page.
    // request contains requirements that output should match,
    // like show only firstName, lastName and email

    // example: /student/1/10
    // request.requirements = {firstName: 1, email: 1}
    // get students on the 2nd page with 10 entries per page
    // returns only first names and emails.
    getStudents: (req, res, next) => {
        var requirements = req.body.requirements || {};
        delete requirements['credentials.password'];
        var filter = {};
        if (req.body.filter !== undefined) {
            // TODO: set up filters
        }

        Student.find(filter, requirements)
            .sort({'_id': -1})
            .skip(req.params.page*req.params.limit)
            .limit(parseInt(req.params.limit))
            .exec((err, students) => {
                res.status(200).json(students);
            });
    },

    // /student/:id
    // returns student by id.
    // request contains requirements that output should match,
    // like show only firstName, lastName and email

    // example: /student/5b6cc829e3956907dc4532cd
    getStudentById: (req, res, next) => {
        Student.findById(req.params.id, {'credentials.password': 0}, (err, student) => {
            if (err) {
                return res.status(500).json(err);
            }
            return res.status(200).json(student);
        });
    },

    // /vacancy/ids/:page/:limit
    // :limit = number of vacancies per page
    // :page = page number starting from 0

    // returns ids of vacancies that should be rendered on the page.
    // request contains filter that matches things like minSalary, vacancyField, etc..

    // example: /vacancy/ids/1/10
    // request.filter = {minSalary: 100000, type: ["full-time"]}
    // get full-time vacancies with minSalary over 100000 on the
    // 2nd page with 10 entries per page
    getVacancyIds: async (req, res, next) => {
        Vacancy.find(filterOut(req.body.filter), {'_id': 1})
            .sort({'_id': -1})
            .skip(req.params.page*req.params.limit)
            .limit(parseInt(req.params.limit))
            .exec((err, vacancies) => {
                res.status(200).json(vacancies.map(x => x._id));
            });
    },

    // /vacancy/:page/:limit
    // :limit = number of vacancies per page
    // :page = page number starting from 0

    // request contains filter that matches things like minSalary, vacancyField, etc..
    // request also contains requirements that output should match,
    // like show only minSalary, vacancyName and companyId

    // example: /vacancy/1/10
    // request.filter = {minSalary: 100000, type: ["full-time"]}
    // request.requirements = {vacancyName: 1, companyId: 1}
    // get full-time vacancies with minSalary over 100000 on the
    // 2nd page with 10 entries per page
    // returns only vacancy names and company ids.
    getVacancies: (req, res, next) => {
        var requirements = req.body.requirements || {};

        Vacancy.find(filterOut(req.body.filter), requirements)
            .sort({'_id': -1})
            .skip(req.params.page*req.params.limit)
            .limit(parseInt(req.params.limit))
            .exec((err, vacancies) => {
                res.status(200).json(vacancies);
            });
    },

    // /vacancy/:id
    // request contains requirements that output should match,
    // like show only minSalary, vacancyName and companyId
    // returns vacancy by id.

    // example: /vacancy/5b6cc829e3956907dc4532cd
    getVacancyById: (req, res, next) => {
        Vacancy.findById(req.params.id, (err, vacancy) => {
            if (err) {
                return res.status(500).json(err);
            }
            return res.status(200).json(vacancy);
        });
    },

    // Контроллер возвращает сет вопросов анкеты по номеру сета
    //
    // GET /questionnaire/question-set/:setNumber
    getQuestionSet: async (req, res, next) => {
        var err, questionSet;

        // Ищем сет в базе данных
        [err, questionSet] = await to(
            Questionnaire.QuestionSet.find({
                setNumber: req.params.setNumber,
            })
        );
        if (err) {
            return res.status(500).json({error: err.message});
        }

        // Возвращаем сет вопросов
        return res.status(200).json({ questionSet });
    },

    // Контроллер возвращает общую информацию по сетам вопросов:
    // названия, номера и кол-во ответов если есть айди студента
    //
    // GET /questionnaire/question-sets-info/:studentId
    getQuestionSetsInfo: async (req, res, next) => {
        var err, questionSets;

        // Ищем инфу сетов
        [err, questionSets] = await to(
            helpers.questionSetsInfo(req.params.studentId)
        );
        if (err) {
            return res.status(500).json({error: err.message});
        }

        // Возвращаем сеты вопросов
        return res.status(200).json({ questionSets });
    },

    // Контроллер возвращает все сеты вопросов
    //
    // GET /questionnaire/all-question-sets
    getAllQuestionSets: async (req, res, next) => {
        var err, questionSets;

        // Ищем сеты в базе данных
        [err, questionSets] = await to(
            Questionnaire.QuestionSet.find({}).sort({ setNumber: 1 })
        );
        if (err) {
            return res.status(500).json({error: err.message});
        }

        // Возвращаем сеты вопросов
        return res.status(200).json({ questionSets });
    },
};
