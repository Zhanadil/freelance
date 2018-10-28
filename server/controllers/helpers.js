const to = require('await-to-js').default;
const bcrypt = require('bcrypt');

const JWT = require('jsonwebtoken');
const { JWT_SECRET } = require('@configuration');
const Student = require('@models/student');
const Company = require('@models/company');
const Questionnaire = require('@models/questionnaire');

// Registers JsonWebToken for a user
module.exports = {
    hashPassword: async (password) => {
        const salt = await bcrypt.genSalt(10);
        return await bcrypt.hash(password, salt);
    },

    signToken: async (user) => {
        var type = '';
        if (user instanceof Company) {
            type = 'company';
        } else if (user instanceof Student) {
            type = 'student';
        }
        return await JWT.sign({
            iss: 'john',
            sub: {
                id: user.id,
                type: type,
            },
            iat: Date.now(),
            exp: new Date().setDate(new Date().getDate() + 1)
        }, JWT_SECRET);
    },

    questionSetsInfo: async (studentId) => {
        var err, questionSets, answers;

        // Ищем сеты в базе данных
        [err, questionSets] = await to(
            Questionnaire.QuestionSet
                .aggregate([
                    {
                        $project: {
                            setName: 1, // Название сета
                            setNumber: 1, // Номер сета
                            questions: { // Кол-во вопросов
                                $size: '$questions'
                            }
                        }
                    },
                    {
                        $sort: { // Сортирует по номеру сета
                            setNumber: 1
                        }
                    }
                ])
        );
        if (err) {
            throw err;
        }

        if (!studentId) {
            return questionSets;
        }

        // Находим ответы студента
        [err, answers] = await to(
            Questionnaire.Answer
                .aggregate([
                    {
                        // Находим ответы только данного студента
                        $match: {
                            studentId
                        }
                    },
                    {
                        $group: { // Группируем ответы по номеру сета
                            _id: '$setNumber',
                            count: { // Считаем кол-во ответов для каждого сета
                                $sum: 1
                            }
                        }
                    }
                ])
        )
        if (err) {
            throw err;
        }

        // Переносим кол-во ответов в questionSets
        questionSets.forEach((questionSet) => {
            answers.some((answer) => {
                // Если номера сетов одинаковые, то меняем questionSets
                if (answer._id === questionSet.setNumber) {
                    questionSet.answers = answer.count;
                    return true;
                }
                return false;
            })
            // Если ничего не нашли, то значит кол-во ответов = 0
            if (!questionSet.answers) {
                questionSet.answers = 0;
            }
        })

        // Возвращаем сеты вопросов
        return questionSets;
    }
}
