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
        enum: ['pending', 'canceled', 'rejected'],
    },
    // Заявка неактивна в случае принятия другой заявки на данную задачу
    // Принимать ее в таком случае нельзя
    // Она может обратно стать активной если прошлую заявку отменят
    isActive: {
        type: Boolean,
        default: true,
    },
    // С чьей стороны отправлена заявка
    sender: {
        type: String,
        enum: ['student', 'company'],
    },
    coverLetter: String,
    newBounty: Number,
    studentDiscarded: Boolean,
    companyDiscarded: Boolean,
});

// Vacancy DB
// Contains vacancy information including vacancy name, description, salaries,
// company id, all students who applied, all students who were called by the company.
const taskSchema = mongoose.Schema({
    description: String,
    demands: [String],
    type: [String],
    maxSalary: Number,
    vacancyField: String,
    vacancyName: String,
    companyId: String,
    companyName: String,
    deadline: Date,
});

const ongoingTaskSchema = taskSchema.clone();
ongoingTaskSchema.add({
    status: {
        type: String,
        enum: ['ongoing', 'completed'],
    },
    freelancerId: String,
});

const application = mongoose.model('application', applicationSchema);
const task = mongoose.model('task', taskSchema);
const ongoingtask = mongoose.model('ongoingtask', ongoingTaskSchema);

module.exports = {
    Application: application,
    Vacancy: task,
    OngoingTask: ongoingtask,
};
