const JWT = require('jsonwebtoken');

const to = require('await-to-js').default;

const { Company } = require('@models/company');
const Student = require('@models/student');
const { Application, Vacancy } = require('@models/vacancy');
const JWT_SECRET = require('config').get('JWT_SECRET');

statusId = (requester, status, sender) => {
    if (status === "pending" && sender !== requester) {
        return 1;
    }
    if (status === "pending" && sender === requester) {
        return 2;
    }
    if (status === "rejected") {
        return 4;
    }
    return 0;
}

// Setting up filters based on request
filterOut = filter => {
    if (filter === undefined) {
        return {};
    }
    var result = {};
    if (filter.cost !== undefined) {
        result.cost = {'$lte': filter.cost};
    }
    if (filter.vacancyField !== undefined) {
        result.vacancyField = filter.vacancyField;
    }
    return result;
}

// Все функции манипулирующие вакансиями
module.exports = {
    // Создать новую вакансию для компании
    // req.body: {
    //      vacancyField: String // Область профессии(IT, Менеджмент, Кулинария)
    //      vacancyName: String  // Название профессии(Джуниор Программист, Повар)
    //      description: String  // Описание
    //      demands: [String]    // Требования
    //      cost: Number         // Макс зп
    //      deadline: String     // Дедлайн задачи
    // }
    newVacancy: async (req, res, next) => {
        var details = req.body;

        // Find Company which creates the vacancy.
        const company = req.account;

        details.companyId = company.id;
        details.companyName = company.name;

        // Create new vacancy.
        new Vacancy(details).save((err, vacancy) => {
            if (err) {
                next(err);
            }

            return res.status(200).json({
                vacancy
            });
        });
    },

    // Удалить вакансию по айди
    // Статус вакансии и всех заявок становится 'deleted'
    removeTask: async (req, res, next) => {
        const vacancyId = req.params.id;
        let err, vacancy;
        // Находим задачу по айди
        [err, vacancy] = await to(
            Vacancy.findOne({
                _id: vacancyId,
                companyId: req.account._id,
            })
        );
        if (err) {
            return next(err);
        }
        if (!vacancy) {
            err = new Error('vacancy not found');
            err.status = 404;

            return next(err);
        }
        if (vacancy.state !== 'pending') {
            err = new Error(`vacancy state is ${vacancy.state}, cannot remove`);
            err.status = 403;

            return next(err);
        }

        // Меняем статус задачи на удаленную
        vacancy.state = 'deleted';
        [err, vacancy] = await to(
            vacancy.save()
        );
        if (err) {
            return next(err);
        }

        // Меняем статус заявок связанных с задачей на удаленные
        [err] = await to(
            Application.updateMany({
                vacancyId
            }, {
                activityState: 'deleted'
            })
        );
        if (err) {
            return next(err);
        }

        return res.status(200).send(vacancy);
    },

    // Компания отправляет заявку на вакансию студенту
    // req.body: {
    //      vacancyId: String
    //      studentId: String
    // }
    companyApplication: async (req, res, next) => {
        var vacancyPromise = Vacancy.findById(req.body.vacancyId).exec();
        var studentPromise = Student.findById(req.body.studentId).exec();
        // Проверяем айди вакансии на действительность
        var [err, vacancy] = await to(
            vacancyPromise
        );
        if (err) {
            return res.status(500).json({error: err.message});
        }
        if (!vacancy) {
            return res.status(400).json({error: "vacancy not found"});
        }
        if (vacancy.companyId !== req.account._id.toString()) {
            return res.status(403).json({error: "wrong vacancyId"});
        }
        if (vacancy.state !== 'pending') {
            return res.status(400).send('application stage is closed');
        }

        // Find the student.
        var student;
        [err, student] = await to(
            studentPromise
        );
        if (err) {
            return res.status(500).json({error: err.message});
        }
        if (!student) {
            return res.status(400).json({error: "student not found"});
        }

        var application;
        [err, application] = await to(
            Application.findOne({
                studentId: req.body.studentId,
                vacancyId: req.body.vacancyId
            })
        );
        if (err) {
            return res.status(500).json({error: err.message});
        }

        // Если заявка уже существует
        if (application) {
            // Отправить заявку повторно можно только если статус
            // заявки 'canceled' или 'rejected'
            if (application.status !== 'canceled' && application.status !== 'rejected') {
                return res.status(409).json({
                    error: `student can't be called, current status is: ${application.status}`
                });
            }
            if (application.activityState === 'deleted') {
                return res.status(400).send('application was already deleted, cannot reapply');
            }
            if (application.activityState === 'inactive') {
                let err = new Error('application is inactive, cannot apply');
                err.status = 403;
                return next(err);
            }
            application.status = 'pending';
            application.sender = 'company';
            application.studentDiscarded = false;
            application.companyDiscarded = false;

            [err, application] = await to(
                application.save()
            );

            return res.status(200).send(application);
        }

        var applicationPromise = (new Application({
            vacancyId: req.body.vacancyId,
            companyId: req.account._id,
            studentId: req.body.studentId,
            sender: "company",
            studentDiscarded: false,
            companyDiscarded: false,
        })).save();

        [err, application] = await to(
            applicationPromise
        );
        if (err) {
            return res.status(500).send(err.message);
        }

        [err] = await to(
            studentPromise
        );
        if (err) {
            return res.status(500).send(err.message);
        }

        return res.status(200).send(application);
    },

    // Компания помечает задачу как законченая.
    // TODO: снять деньги со счета и перевести на счет фрилансера
    completeTask: async (req, res, next) => {
        let err;
        const vacancyId = req.body.vacancyId;

        // Находим задачу которую нужно выполнить
        let task;
        [err, task] = await to(
            Vacancy.findById(vacancyId)
        );
        if (err) {
            return next(err);
        }
        if (!task) {
            err = new Error('task not found');
            err.status = 404;

            return next(err);
        }
        if (task.state !== 'ongoing') {
            err = new Error(`task state is ${task.state}, cannot change`);
            err.status = 403;

            return next(err);
        }

        // Помечаем задачу, как законченая.
        task.state = 'completed';
        [err, task] = await to(
            task.save()
        );
        if (err) {
            return next(err);
        }

        // TODO: перевести деньги на счет фрилансера

        // Удаляем все заявки из списка
        [err] = await to(
            Application.updateMany({
                vacancyId
            }, {
                activityState: 'deleted'
            })
        );
        if (err) {
            return next(err);
        }

        return res.status(200).send(task);
    },

    // Студент отправляет заявку на вакансию
    // req.body: {
    //      vacancyId: String,
    //      coverLetter: String,
    //      newCost: Number,
    // }
    studentApplication: async (req, res, next) => {
        // Айди компании которая создала вакансию, нужно для создания заявки
        var err, vacancy;
        // Проверяем айди вакансии на действительность
        [err, vacancy] = await to(
            Vacancy.findById(req.body.vacancyId)
        );
        if (err) {
            return res.status(500).json({error: err.message});
        }
        if (!vacancy) {
            return res.status(400).json({error: "vacancy not found"});
        }
        if (vacancy.state !== 'pending') {
            return res.status(400).send('application stage is closed');
        }
        var companyId = vacancy.companyId;

        // Прикладное письмо
        var coverLetter = null;
        if (req.body.coverLetter) {
            coverLetter = req.body.coverLetter;
        }

        var newCost = null;
        if (req.body.newCost) {
            newCost = req.body.newCost;
        }

        // Проверяем айди студента
        var student;
        [err, student] = await to(
            Student.findById(req.account._id)
        );
        if (err) {
            return res.status(500).json({error: err.message});
        }
        if (!student) {
            return res.status(400).json({error: "student not found"});
        }

        // Находим заявку
        var application;
        [err, application] = await to(
            Application.findOne(
                {
                    studentId: req.account._id,
                    vacancyId: req.body.vacancyId
                }
            )
        );
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Если заявка уже существует
        if (application) {
            // Отправить заявку повторно можно только если статус
            // заявки 'canceled' или 'rejected'
            if (application.status !== 'canceled' && application.status !== 'rejected') {
                console.log(application);
                console.log(application.status);
                return res.status(409).json({
                    error: `student can't apply, current status is: ${application.status}`
                });
            }
            if (application.activityState === 'deleted') {
                return res.status(400).send('application was already deleted, cannot reapply');
            }
            if (application.activityState === 'inactive') {
                let err = new Error('application is inactive, cannot apply');
                err.status = 403;
                return next(err);
            }
            application.status = 'pending';
            application.sender = 'student';
            application.coverLetter = coverLetter;
            application.newCost = newCost;
            application.studentDiscarded = false;
            application.companyDiscarded = false;

            await application.save();

            return res.status(200).send(application);
        }

        // Если заявка не существует, то создаем новую
        application = await new Application({
            vacancyId: req.body.vacancyId,
            companyId: companyId,
            studentId: req.account._id,
            sender: "student",
            coverLetter,
            newCost,
            studentDiscarded: false,
            companyDiscarded: false,
        });
        await application.save();

        return res.status(200).send(application);
    },

    // Компания принимает заявку таланта на задачу
    // Удаляем все заявки и переносим задачу в базу текущих задач
    // Меняем стоимость работы на предложенную стоимость работником
    companyAcceptApplication: async (req, res, next) => {
        // Находим заявку по айди
        var [err, application] = await to(
            Application.findOne({
                vacancyId: req.body.vacancyId,
                studentId: req.body.studentId,
            })
        );
        if (err) {
            return res.status(500).send(err.message);
        }
        if (!application) {
            return res.status(400).send('application not found');
        }
        if (application.activityState !== 'active') {
            return res.status(400).send('application inactive, cannot accept');
        }

        // Меняем статус заявки на принято
        application.status = 'accepted';
        [err, application] = await to(
            application.save()
        );
        if (err) {
            return next(err);
        }

        // Деактивируем заявки, принять их уже нельзя, отказаться можно если
        // твоя заявка не принята
        Application.updateMany({
            vacancyId: req.body.vacancyId,
            activityState: 'active',
        }, {
            activityState: 'inactive'
        }, (err) => {
            if (err) {
                console.log(err.message);
            }
            // TODO(zhanadil): нужно правильно обработать ошибку
            // Проблема в том, что запрос к этому моменту может быть завершен
        });

        // Находим вакансию по айди
        var [err, vacancy] = await to(
            Vacancy.findById(
                req.body.vacancyId
            )
        );
        if (err) {
            return res.status(500).send(err.message);
        }

        vacancy.cost = application.newCost || vacancy.cost;
        vacancy.state = 'ongoing';
        vacancy.freelancerId = req.body.studentId;

        // Переносим задачу в список текущих
        [err, vacancy] = await to(
            vacancy.save()
        );
        if (err) {
            return res.status(500).send(err.message);
        }

        return res.status(200).json({
            application,
            vacancy,
        });
    },

    // Работник принимает заявку компании на задачу
    // Удаляем все заявки и переносим задачу в базу текущих задач
    freelancerAcceptApplication: async (req, res, next) => {
        // Находим заявку по айди
        var [err, application] = await to(
            Application.findOne({
                vacancyId: req.body.vacancyId,
                studentId: req.account.id,
            })
        );
        if (err) {
            return res.status(500).send(err.message);
        }
        if (!application) {
            return res.status(400).send('application not found');
        }
        if (application.status !== 'pending') {
            return res.status(400).send(`application status is ${application.status}, cannot change`);
        }
        // Принять неактивную заявку нельзя
        if (application.activityState !== 'active') {
            return res.status(400).send('application inactive, cannot accept');
        }

        // Меняем статус заявки на принято
        application.status = 'accepted';
        [err, application] = await to(
            application.save()
        );
        if (err) {
            return next(err);
        }

        // Деактивируем заявки, принять их уже нельзя, отказаться можно если
        // твоя заявка не принята
        Application.updateMany({
            vacancyId: req.body.vacancyId,
            activityState: 'active',
        }, {
            activityState: 'inactive'
        }, (err) => {
            if (err) {
                console.log(err.message);
            }
            // TODO(zhanadil): нужно правильно обработать ошибку
            // Проблема в том, что запрос к этому моменту может быть завершен
        });

        // Находим вакансию по айди
        var [err, vacancy] = await to(
            Vacancy.findById(
                req.body.vacancyId
            )
        );
        if (err) {
            return res.status(500).send(err.message);
        }

        // Меняем статус задачи на "в процессе работы"
        vacancy.state = 'ongoing';
        vacancy.freelancerId = req.account.id;

        [err, vacancy] = await to(
            vacancy.save()
        );
        if (err) {
            return res.status(500).send(err.message);
        }

        return res.status(200).json({
            vacancy,
            application,
        });
    },

    // Отмена заявки компании.
    //
    // Компания не может отменить заявку если она уже была принята.
    // Вместо этого нужно расторгнуть контракт (/company/vacancy/revoke)
    companyCancelApplication: async (req, res, next) => {
        const { vacancyId, studentId } = req.body;
        const vacancyPromise = Vacancy.findById(vacancyId);
        // Находим заявку
        var [err, application] = await to(
            Application.findOne({
                vacancyId,
                studentId,
            })
        );
        if (err) {
            return res.status(500).send(err.message);
        }
        if (!application) {
            return res.status(400).send('application not found');
        }
        // Компания не может отменить запрос студента, она может его отклонить
        if (application.sender === 'student') {
            return res.status(400).send('company cannot cancel student\'s request');
        }
        if (application.activityState === 'inactive') {
            let err = new Error('application is inactive, cannot apply');
            err.status = 403;
            return next(err);
        }

        // Находим задачу в списке текущих
        var vacancy;
        [err, vacancy] = await to(
            vacancyPromise
        );
        if (err) {
            return res.status(500).send(err.message);
        }
        // Если задача нашлась в списке текущих и айди работника над задачей
        // совпадает с работником в заявке, то значит он работает над ней.
        // И отменить заявку он уже не может.
        if (vacancy.state === 'ongoing' && vacancy.freelancerId === studentId) {
            return res.status(400).send('company cannot cancel ongoing application');
        }

        application.status = 'canceled';
        [err] = await to(
            application.save()
        );
        if (err) {
            return res.status(500).send(err.message);
        }

        return res.status(200).json({
            application
        });
    },

    // Отменить заявку можно всем кроме работника который решает задачу
    freelancerCancelApplication: async (req, res, next) => {
        const vacancyId = req.body.vacancyId;
        const vacancyPromise = Vacancy.findById(vacancyId);
        // Находим заявку
        var [err, application] = await to(
            Application.findOne({
                vacancyId,
                studentId: req.account.id,
            })
        );
        if (err) {
            return res.status(500).send(err.message);
        }
        if (!application) {
            return res.status(400).send('application not found');
        }
        if (application.sender === 'company') {
            return res.status(400).send('student cannot cancel company\'s request');
        }

        // Находим задачу в списке текущих
        var vacancy;
        [err, vacancy] = await to(
            vacancyPromise
        );
        if (err) {
            return res.status(500).send(err.message);
        }

        // Если задача нашлась в списке текущих и айди работника над задачей
        // совпадает с айди делающего запрос, то значит он работает над ней.
        // И, отменить заявку он уже не может.
        if (vacancy.activityState === 'ongoing' && vacancy.freelancerId === req.account._id.toString()) {
            return res.status(400).send('freelancer working on the task cannot cancel it');
        }

        application.status = 'canceled';
        [err] = await to(
            application.save()
        );
        if (err) {
            return res.status(500).send(err.message);
        }

        return res.status(200).json({
            application
        });
    },

    // Компания отклоняет заявку студента
    companyRejectApplication: async (req, res, next) => {
        const { vacancyId, studentId } = req.body;
        const vacancyPromise = Vacancy.findOne({
            _id: vacancyId,
            // Можно менять статус заявки, только если вакансия в процессе поиска
            state: 'pending',
        }).exec();
        const applicationPromise = Application.findOne({
            vacancyId,
            studentId,
            // Компания может отменить заявку только если она активна,
            // отправитель студент и статус "в ожидании"
            activityState: 'active',
            sender: 'student',
            status: 'pending',
        }).exec();

        // Находим задачу
        let [err, vacancy] = await to(
            vacancyPromise
        );
        if (err) {
            return next(err);
        }
        if (!vacancy) {
            err = new Error('vacancy not found');
            err.status(404);

            return next(err);
        }

        // Находим заявку
        let application;
        [err, application] = await to(
            applicationPromise
        );
        if (err) {
            return next(err);
        }
        if (!application) {
            err = new Error('application not found');
            err.status(404);

            return next(err);
        }

        // Меняем статус заявки
        application.status = 'rejected';
        [err, application] = await to(
            application.save()
        );
        if (err) {
            return next(err);
        }

        return res.status(200).send(application);
    },

    // Студент отклоняет заявку компании
    studentRejectApplication: async (req, res, next) => {
        const { vacancyId } = req.body;
        const studentId = req.account._id.toString();
        const vacancyPromise = Vacancy.findOne({
            _id: vacancyId,
            // Можно менять статус заявки, только если вакансия в процессе поиска
            state: 'pending',
        }).exec();
        const applicationPromise = Application.findOne({
            vacancyId,
            studentId,
            // Компания может отменить заявку только если она активна,
            // отправитель студент и статус "в ожидании"
            activityState: 'active',
            sender: 'company',
            status: 'pending',
        }).exec();

        // Находим задачу
        let [err, vacancy] = await to(
            vacancyPromise
        );
        if (err) {
            return next(err);
        }
        if (!vacancy) {
            err = new Error('vacancy not found');
            err.status = 404;

            return next(err);
        }

        // Находим заявку
        let application;
        [err, application] = await to(
            applicationPromise
        );
        if (err) {
            return next(err);
        }
        if (!application) {
            err = new Error('application not found');
            err.status = 404;

            return next(err);
        }

        // Меняем статус заявки
        application.status = 'rejected';
        [err, application] = await to(
            application.save()
        );
        if (err) {
            return next(err);
        }

        return res.status(200).send(application);
    },

    // Удаляет принятую заявку, реактивирует все остальные и переносит задачу
    // из текущих
    // req.body: {
    //     vacancyId: String
    // }
    companyRevokeApplication: async (req, res, next) => {
        let returnError;
        const { vacancyId } = req.body;

        // Находим задачу
        var [err, task] = await to(
            Vacancy.findById(vacancyId)
        );
        if (err) {
            return next(err);
        }
        if (!task) {
            returnError = new Error('task not found');
            returnError.status = 404;

            return next(returnError);
        }
        if (task.state !== 'ongoing' || !task.freelancerId) {
            returnError = new Error(`you cannot cancel ${task.state} task`);
            returnError.state = 403;

            return next(returnError);
        }

        // Находим заявку фрилансера который работает над задачей
        var currentApplication;
        [err, currentApplication] = await to(
            Application.findOne({
                vacancyId,
                studentId: task.freelancerId
            })
        );
        if (err) {
            return res.status(500).send(err.message);
        }
        if (!currentApplication) {
            return res.status(400).send('application not found');
        }

        // Меняем статус заявки на 'revoked'
        currentApplication.status = 'revoked';
        currentApplication.activityState = 'deleted';
        [err] = await to(
            currentApplication.save()
        )
        if (err) {
            return next(err);
        }

        // Меняем статус задачи и удаляем фрилансера из задачи
        task.state = 'pending';
        task.freelancerId = undefined;

        [err, task] = await to(
            task.save()
        );
        if (err) {
            return res.status(500).send(err.message);
        }

        // Реактивируем все неактивные заявки
        Application.updateMany({
            vacancyId,
            activityState: 'inactive',
        }, {
            activityState: 'active'
        }, (err) => {
            if (err) {
                console.log(err);
            }
        });

        return res.status(200).json({
            task
        });
    },

    companyOngoingTasks: (req, res, next) => {
        Vacancy.find({
            companyId: req.account.id,
            state: 'ongoing'
        }, (err, tasks) => {
            if (err) {
                return res.status(500).send(err.message);
            }

            return res.status(200).json({
                tasks
            });
        })
    },

    freelancerOngoingTasks: (req, res, next) => {
        Vacancy.find({
            freelancerId: req.account.id,
            state: 'ongoing'
        }, (err, tasks) => {
            if (err) {
                return res.status(500).send(err.message);
            }

            return res.status(200).json({
                tasks
            });
        })
    },

    // Студент скрывает заявку
    studentDiscardApplication: async (req, res, next) => {
        const application = await Application.findOne({
                vacancyId: req.body.vacancyId,
                studentId: req.account._id
            }, (err) => {
                if (err) {
                    return res.status(500).json({err: err.message});
                }
            });

        if (!application) {
            return res.status(400).json({error: "application doesn't exist"});
        }

        application.studentDiscarded = true;
        await application.save();

        return res.status(200).json({status: "ok"});
    },

    // Студент скрывает заявку
    companyDiscardApplication: async (req, res, next) => {
        const application = await Application.findOne({
                vacancyId: req.body.vacancyId,
                studentId: req.body.studentId
            }, (err) => {
                if (err) {
                    return res.status(500).json({err: err.message});
                }
            });

        if (!application) {
            return res.status(400).json({error: "application doesn't exist"});
        }

        application.companyDiscarded = true;
        await application.save();

        return res.status(200).json({status: "ok"});
    },

    // Get all vacancies related to this company, based on status written in request.
    getCompanyVacancies: async (req, res, next) => {
        Vacancy.find({
            companyId: req.account._id,
            state: "pending",
        }, (err, vacancies) => {
            if (err) {
                return next(err);
            }
            return res.status(200).json({vacancies: vacancies});
        });
    },

    // Возвращает все заявки связанные с компанией и всю информацию о вакансиях
    // и студентах связанных с этими заявками
    getCompanyApplications: async (req, res, next) => {
        var err, applications;
        var vacancies, vacancyIds = [];
        var students, studentIds = [];

        // У нас есть четыре типа фильтров
        var applicationsFilter = {
            activityState: {
                $ne: 'deleted'
            },
        };
        applicationsFilter.companyId = req.account._id;
        applicationsFilter.companyDiscarded = false;
        // 1: Входящие необработанные заявки
        if (req.body.statusId === 1) {
            applicationsFilter.sender = "student";
            applicationsFilter.status = "pending";
        }
        // 2: Исходящие необработанные заявки
        if (req.body.statusId === 2) {
            applicationsFilter.sender = "company";
            applicationsFilter.status = "pending";
        }
        // 3: Принятые заявки
        if (req.body.statusId === 3) {
            applicationsFilter.status = "accepted";
        }
        // 4: Отклоненные заявки
        if (req.body.statusId === 4) {
            applicationsFilter.status = "rejected";
        }
        // Находим все заявки студента, которые он не скрыл в отфильтрованном виде
        [err, applications] = await to(
            Application.find(applicationsFilter).lean()
        );
        if (err) {
            return res.status(500).json({error: err.message});
        }

        // Выписываем айди отфильтрованных вакансий и айди студентов находящихся в заявке
        applications.forEach(v => {
            v.status = statusId("company", v.status, v.sender);
            v.sender = undefined;
            vacancyIds.push(v.vacancyId);
            if (studentIds.indexOf(v.studentId) === -1) {
                studentIds.push(v.studentId);
            }
        });

        // Находим все эти вакансии
        [err, vacancies] = await to(
            Vacancy.find({
                "_id": {
                    "$in": vacancyIds
                }
            })
        );
        if (err) {
            return res.status(500).json({error: err.message});
        }

        // Находим всех студентов, айди которых мы выписали
        [err, students] = await to(
            Student.find(
                {
                    "_id": {
                        "$in": studentIds
                    }
                },
                {
                    "credentials.password": 0,
                    "credentials.method": 0
                }
            )
        );
        if (err) {
            return res.status(500).json({error: err.message});
        }

        // Возвращаем все данные:
        //  Вакансии, Заявки, Студенты
        return res.status(200).json({
            vacancies,
            applications,
            students,
        });
    },

    // Возвращает ВСЕ вакансии и если студент участвовал в них, то вместе со статусом.
    // При этом заранее пагинирует, например: вторая страница 10 запросов
    // Запрос содержит фильтры по cost,
    // область работы(vacancyField), и др.
    // Например: request.filter = {cost: 100000}
    // Также содержит параметры которые нужно вернуть
    // К примеру:
    // request.requirements = {vacancyName: 1, companyId: 1}
    // В таком случае вернет все вакансии с зп выше 100000 на полную ставку
    // Из информации вернет только название вакансий и айди компании
    getAllVacanciesAsStudent: async (req, res, next) => {
        var requirements = req.body.requirements || {};
        var filters = filterOut(req.body.filter);
        var err, vacancies;
        var applications

        filters.state = 'pending';

        // Находим все вакансии в пагинированном виде
        [err, vacancies] = await to(
            Vacancy.find(filters, requirements)
                .sort({'_id': -1})
                .skip(req.params.page*req.params.limit)
                .limit(parseInt(req.params.limit))
                .lean()
                .exec()
        );
        if (err) {
            return res.status(500).json({error: err.message});
        }

        // Находим все заявки студента которые он не скрыл
        [err, applications] = await to(
            Application.find(
                {
                    studentId: req.account._id,
                    studentDiscarded: false,
                },
                {
                    vacancyId: 1,
                    status: 1,
                    sender: 1,
                }
            )
        );
        if (err) {
            return res.status(500).json({error: err.message});
        }

        // Проверяем если на вакансию есть заявка студента,
        // то добавляем статус заявки
        vacancies.forEach((vacancy, i, vacancies) => {
            applications.some(application => {
                if (vacancy._id.toString() === application.vacancyId) {
                    vacancies[i].status =
                        statusId("student", application.status, application.sender);
                    return true;
                }
                return false;
            });
            if (vacancies[i].status === undefined) {
                vacancies[i].status = 0;
            }
        });
        return res.status(200).json({vacancies});
    },

    // Возвращает вакансию по айди и если студент участвовал в ней, то вместе со статусом.
    // Запрос содержит параметры которые нужно вернуть
    // К примеру:
    // request.requirements = {vacancyName: 1, companyId: 1}
    // Из информации вернет только название вакансии и айди компании
    getVacancyByIdAsStudent: async (req, res, next) => {
        var requirements = req.body.requirements || {};
        var err, vacancy;
        var application

        // Находим все вакансии в пагинированном виде
        [err, vacancy] = await to(
            Vacancy.findById(req.params.id, requirements).lean().exec()
        );
        if (err) {
            return res.status(500).json({error: err.message});
        }
        if (!vacancy) {
            return res.status(400).json({error: "Vacancy doesn't exist"});
        }

        // Находим все заявки студента которые он не скрыл
        [err, application] = await to(
            Application.findOne(
                {
                    vacancyId: req.params.id,
                    studentId: req.account._id,
                    studentDiscarded: false,
                },
                {
                    vacancyId: 1,
                    status: 1,
                    sender: 1,
                }
            )
        );
        if (err) {
            return res.status(500).json({error: err.message});
        }

        // Проверяем если на вакансию есть заявка студента,
        // то добавляем статус заявки
        if (application) {
            vacancy.status = statusId("student", application.status, application.sender);
        } else {
            vacancy.status = 0;
        }
        return res.status(200).json({vacancy});
    },

    // Возвращает все заявки связанные со студентом и всю информацию о вакансиях
    // и компаниях связанных с этими заявками
    getStudentApplications: async (req, res, next) => {
        var err;
        var vacancies, vacancyIds = [], applications;
        var companies, companyIds = [];

        // У нас есть четыре типа фильтров
        var applicationsFilter = {
            activityState: {
                $ne: 'deleted'
            },
        };
        applicationsFilter.studentId = req.account._id;
        applicationsFilter.studentDiscarded = false;
        // 1: Входящие необработанные заявки
        if (req.body.statusId === 1) {
            applicationsFilter.sender = "company";
            applicationsFilter.status = "pending";
        }
        // 2: Исходящие необработанные заявки
        if (req.body.statusId === 2) {
            applicationsFilter.sender = "student";
            applicationsFilter.status = "pending";
        }
        // 3: Принятые заявки
        if (req.body.statusId === 3) {
            applicationsFilter.status = "accepted";
        }
        // 4: Отклоненные заявки
        if (req.body.statusId === 4) {
            applicationsFilter.status = "rejected";
        }
        // Находим все заявки студента, которые он не скрыл в отфильтрованном виде
        [err, applications] = await to(
            Application.find(applicationsFilter)
        );
        if (err) {
            return res.status(500).json({error: err.message});
        }

        // Выписываем айди отфильтрованных вакансий и айди компаний создавших эти вакансии
        applications.forEach(v => {
            vacancyIds.push(v.vacancyId);
            if (companyIds.indexOf(v.companyId) === -1) {
                companyIds.push(v.companyId);
            }
        });

        // Находим все эти вакансии
        [err, vacancies] = await to(
            Vacancy.find({
                "_id": {
                    "$in": vacancyIds
                }
            })
        );
        if (err) {
            return res.status(500).json({error: err.message});
        }

        // Находим все компании, айди которых мы выписали
        [err, companies] = await to(
            Company.find(
                {
                    "_id": {
                        "$in": companyIds
                    }
                },
                {
                    "credentials.password": 0,
                    "credentials.method": 0
                }
            )
        );
        if (err) {
            return res.status(500).json({error: err.message});
        }

        // Возвращаем все данные:
        //  Вакансии, Заявки, Компании
        return res.status(200).json({
            vacancies,
            applications,
            companies,
        });
    },
};
