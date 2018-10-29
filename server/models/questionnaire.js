const mongoose = require('mongoose');

const { questionSetSchema, answerSchema } = require('@models/schemas/questionnaire');

const QuestionSet = mongoose.model('questionset', questionSetSchema);
const Answer = mongoose.model('answer', answerSchema);

// *************************** HELPERS ***************************

const findQuestion = (questionNumber) => {
    return (element) => {
        return element.questionNumber === questionNumber;
    }
}

const questionCompare = () => {
    return (a, b) => {
        return a.questionNumber - b.questionNumber;
    }
}

module.exports = {
    QuestionSet,
    Answer,
    findQuestion,
    questionCompare,
};
