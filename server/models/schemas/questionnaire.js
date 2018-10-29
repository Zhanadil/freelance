const mongoose = require('mongoose');

// Схема сетов вопросов. Содержит название вопросника, номер и вопросы.
// Вопросы содержат текст вопроса,
// Тип вопроса: ["открытый вопрос", "мультивариантный", "одновариантный", "дропдаун"]
// и возможные варианты ответа.
// Заметка:
//      Одновариантный и дропдаун вопросы по своей сути не отличаются.
//      Разное только отображение вопроса.
// TODO:
// Возможно нужно будет добавить пререквизиты для вопросов или даже сетов.
// Например, нельзя ответить на вопрос Б пока не ответил на А.
const questionSetSchema = mongoose.Schema({
    setName: {
        type: String,
        default: "Тест"
    },
    setNumber: Number,
    setType: {
        type: String,
        enum: ['belbin', 'general'],
    },
    questions: [{
        questionNumber: Number,
        questionText: String,
        questionType: {
            type: String,
            enum: ['openended', 'multichoice', 'singlechoice', 'dropdown', 'belbin'],
        },
        answers: [String],
    }],
});

// База данных ответов
// Содержит айди студента, айди сета, айди вопроса в сете, и массив ответов
// В случае если тип вопроса не 'multichoice', то массив должен содержать
// только один ответ
const answerSchema = mongoose.Schema({
    studentId: String,
    setNumber: Number,
    setName: {
        type: String,
        default: "Тест"
    },
    questionNumber: Number,
    answers: [String],
});

module.exports = {
    questionSetSchema,
    answerSchema
};
