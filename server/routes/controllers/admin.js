const to = require('await-to-js').default;

const Questionnaire = require('@models/questionnaire');

// Все функции администратора
module.exports = {
    // Обновить(создать если не существует) вопрос по номеру сета и номеру вопроса
    //
    // /POST /admin/questionnaire/question/update
    // req.body: {
    //      setNumber: Number,
    //      questionNumber: Number,
    //      questionType: enum: ['openended', 'multichoice', 'singlechoice', 'dropdown', 'belbin'],
    //      questionText: String,
    //      answers: [String],
    // }
    updateQuestion: async (req, res, next) => {
        var err, questionSet;

        // Ищем сет вопросов в базе данных
        [err, questionSet] = await to(
            Questionnaire.QuestionSet.findOne({
                setNumber: req.body.setNumber,
            })
        );
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Если сета нет в базе, то вернуть ошибку
        if (!questionSet) {
            return res.status(400).json({ error: "question set not found" });
        }

        // Обнуляем номер сета, чтобы он не был прописан в документе вопроса.
        req.body.setNumber = undefined;

        // Находим индекс вопроса, если вопроса нет, то вставляем в конец
        var questionIndex = questionSet.questions.findIndex(
            Questionnaire.findQuestion(req.body.questionNumber)
        );
        if (questionIndex === -1) {
            questionIndex = questionSet.questions.length;
        }
        questionSet.questions[questionIndex] = req.body;

        // Сортируем вопросы по номерам
        questionSet.questions.sort(Questionnaire.questionCompare());
        await questionSet.save();

        return res.status(200).json({ status: "ok" });
    },

    // Обновить(создать если не существует) раздел теста Белбина по номеру сета и номеру вопроса
    //
    // /POST /admin/questionnaire/question/update-belbin
    // req.body: {
    //      setNumber: Number,
    //      questionNumber: Number,
    //      questions: [String],
    // }
    updateBelbinQuestion: async (req, res, next) => {
        var err, questionSet;

        // Ищем сет вопросов в базе данных
        [err, questionSet] = await to(
            Questionnaire.QuestionSet.findOne({
                setNumber: req.body.setNumber,
            })
        );
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Если сета нет в базе, то вернуть ошибку
        if (!questionSet) {
            return res.status(400).json({ error: "question set not found" });
        }

        // Находим индекс вопроса, если вопроса нет, то вставляем в конец
        var questionIndex = questionSet.questions.findIndex(
            Questionnaire.findQuestion(req.body.questionNumber)
        );
        if (questionIndex === -1) {
            questionIndex = questionSet.questions.length;
        }

        var questionText = req.body.questions.join(String.fromCharCode(28));

        // Записываем вопрос
        questionSet.questions[questionIndex] = {
            questionNumber: req.body.questionNumber,
            questionText,
            questionType: 'belbin',
            answers: [],
        };

        // Сортируем вопросы по номерам
        questionSet.questions.sort(Questionnaire.questionCompare());
        await questionSet.save();

        return res.status(200).json({ status: "ok" });
    },


    // Удалить вопрос по номеру сета и номеру вопроса
    //
    // /POST /admin/questionnaire/question/delete
    // req.body: {
    //      setNumber: Number,
    //      questionNumber: Number,
    // }
    deleteQuestion: async (req, res, next) => {
        var err, questionSet;

        // Ищем вопрос в базе данных
        [err, questionSet] = await to(
            Questionnaire.QuestionSet.findOne({
                setNumber: req.body.setNumber,
            })
        );
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Если сета вопросов нет в базе, вернуть ошибку
        if (!questionSet) {
            return res.status(400).json({ error: "question set not found" });
        }

        // Находим индекс вопроса
        var questionIndex = questionSet.questions.findIndex(
            Questionnaire.findQuestion(req.body.questionNumber)
        );
        if (questionIndex === -1) {
            return res.status(400).json({ error: "question not found"});
        }

        // Удаляем вопрос
        questionSet.questions.splice(questionIndex, 1);

        // Сохраняем документ
        [err] = await to(
            questionSet.save()
        );
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        return res.status(200).json({ status: "ok" });
    },

    // Создать новый сет вопросов, принимает номер сета и название
    //
    // /POST /admin/questionnaire/set/create
    // req.body: {
    //      setNumber: Number,
    //      setName: String,
    //      setType: String,
    // }
    createQuestionSet: async (req, res, next) => {
        var err, questionSet;

        // Находим сет по номеру
        [err, questionSet] = await to(
            Questionnaire.QuestionSet.findOne({
                setNumber: req.body.setNumber
            })
        )
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Если он существует, то возвращаем ошибку
        if (questionSet) {
            return res.status(400).json({ error: "question set already exists" });
        }

        // Создаем новый сет
        questionSet = await new Questionnaire.QuestionSet({
            setNumber: req.body.setNumber,
            setName: req.body.setName,
            setType: req.body.setType,
        });
        await questionSet.save();

        return res.status(200).json({ status: "ok" });
    },

    // Обновить название сета вопросов, принимает номер сета и название
    //
    // /POST /admin/questionnaire/set/update
    // req.body: {
    //      setNumber: Number,
    //      setName: String,
    //      setType: String,
    // }
    updateQuestionSet: async (req, res, next) => {
        var err, questionSet;

        // Находим сет по номеру
        [err, questionSet] = await to(
            Questionnaire.QuestionSet.findOne({
                setNumber: req.body.setNumber
            })
        )
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Если он не существует, то возвращаем ошибку
        if (!questionSet) {
            return res.status(400).json({ error: "question set not found" });
        }

        // Изменяем название сета
        if (req.body.setName) {
            questionSet.setName = req.body.setName;
        }
        if (req.body.setType) {
            questionSet.setType = req.body.setType;
        }
        await questionSet.save();

        return res.status(200).json({ status: "ok" });
    },


    // Удалить сет вопросов, принимает номер сета
    //
    // /POST /admin/questionnaire/set/delete
    // req.body: {
    //      setNumber: Number
    // }
    deleteQuestionSet: async (req, res, next) => {
        var err, questionSet;

        // Находим сет по номеру
        [err, questionSet] = await to(
            Questionnaire.QuestionSet.findOne({
                setNumber: req.body.setNumber
            })
        )
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Если он не существует, то возвращаем ошибку
        if (!questionSet) {
            return res.status(400).json({ error: "question set not found" });
        }

        // Удаляем сет
        [err] = await to(
            questionSet.remove()
        );
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        return res.status(200).json({ status: "ok" });
    },
};
