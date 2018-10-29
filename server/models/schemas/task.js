const mongoose = require('mongoose');

// Схема заявок:
// Содержит айди вакансии, компании и студента, так же хранит инфо о том кто
// отправил заявку, сопроводительное письмо, и скрыли ли заявку студент или компания.
const applicationSchema = mongoose.Schema({
    vacancyId: String,
    companyId: String,
    studentId: String,
    status: {
        type: String,
        enum: ['pending', 'canceled', 'rejected', 'revoked', 'accepted'],
        default: 'pending',
    },
    // Заявка неактивна в случае принятия другой заявки на данную задачу
    // Принимать ее в таком случае нельзя
    // Она может обратно стать активной если прошлую заявку отменят
    activityState: {
        type: String,
        default: 'active',
        enum: ['active', 'inactive', 'deleted'],
    },
    // С чьей стороны отправлена заявка
    sender: {
        type: String,
        enum: ['student', 'company'],
    },
    coverLetter: String,
    newCost: Number,
    studentDiscarded: Boolean,
    companyDiscarded: Boolean,
});

// Vacancy DB
// Contains vacancy information including vacancy name, description, salaries,
// company id, all students who applied, all students who were called by the company.
const taskSchema = mongoose.Schema({
    description: String,
    demands: [String],
    cost: Number,
    vacancyField: String,
    vacancyName: String,
    companyId: String,
    companyName: String,
    deadline: Date,
    state: {
        type: String,
        enum: ['pending', 'ongoing', 'completed', 'deleted'],
        default: 'pending',
    },
    freelancerId: String,
    startDate: {
        type: Date,
        default: Date.now
    },
});

module.exports = {
    applicationSchema,
    taskSchema
};
