const JWT = require('jsonwebtoken');

const to = require('await-to-js').default;

const Company = require('@models/company');
const Student = require('@models/student');
const { OngoingTask, Vacancy, Application, RevokedApplication } = require('@models/vacancy');
const { JWT_SECRET } = require('@configuration');

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

// Все функции манипулирующие вакансиями
module.exports = {
    // Создать новую вакансию для компании
    // req.body: {
    //      vacancyField: String // Область профессии(IT, Менеджмент, Кулинария)
    //      vacancyName: String  // Название профессии(Джуниор Программист, Повар)
    //      description: String  // Описание
    //      demands: [String]    // Требования
    //      type: [String]       // Тип работы(Полная ставка, стажировка)
    //      minSalary: Int       // Мин зарплата
    //      maxSalary: Int       // Макс зп
    //      deadline: Date       // Дедлайн задачи
    // }
    newVacancy: async (req, res, next) => {
        var details = {};
        details.companyId = req.account.id;
        details.vacancyField = req.body.vacancyField;
        details.vacancyName = req.body.vacancyName;
        details.description = req.body.description;
        details.demands = req.body.demands;
        details.type = req.body.type;
        details.minSalary = req.body.minSalary;
        details.maxSalary = req.body.maxSalary;
        details.deadline = new Date(req.body.deadline);

        // Find Company which creates the vacancy.
        const company = req.account;

        details.companyName = company.name;

        // Create new vacancy.
        new Vacancy(details).save((err, vacancy) => {
            if (err) {
                return res.status(500).send(err.message);
            }

            // Add vacancy to company's vacancy list.
            company.vacancies.push(vacancy._id);

            vacancy.save();
            company.save();

            return res.status(200).json({status: "ok"});
        });
    },

    // Удалить вакансию по айди
    removeVacancy: async (req, res, next) => {
        var err, vacancy;
        [err, vacancy] = await to(Vacancy.findById(req.params.id));
        if (err) {
            return res.status(500).json({error: err.message});
        }
        if (!vacancy) {
            return res.status(400).json({error: "vacancy doesn't exist"});
        }
        if (vacancy.companyId !== req.account._id.toString()) {
            return res.status(403).json({error: "forbidden, vacancy created by other company"});
        }

        [err] = await to(Vacancy.deleteOne({_id: req.params.id}));
        if (err) {
            return res.status(500).json({error: err.message});
        }

        [err] = await to(Application.deleteMany({vacancyId: req.params.id}));
        if (err) {
            return res.status(500).json({error: err.message});
        }

        return res.status(200).json({status: "ok"});
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
            application.status = 'pending';
            application.sender = 'company';
            application.studentDiscarded = false;
            application.companyDiscarded = false;

            [err, application] = await to(
                application.save()
            );

            return res.status(200).json({
                application
            });
        }

        // Add vacancy to student's vacancy list.
        student.vacancies.push(req.body.vacancyId);
        studentPromise = student.save();

        var applicationPromise = (new Application({
            vacancyId: req.body.vacancyId,
            companyId: req.account._id,
            studentId: req.body.studentId,
            status: "pending",
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

        return res.status(200).json({
            application
        });
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
                return res.status(409).json({
                    error: `student can't apply, current status is: ${application.status}`
                });
            }
            application.status = 'pending';
            application.sender = 'student';
            application.coverLetter = coverLetter;
            application.newCost = newCost;
            application.studentDiscarded = false;
            application.companyDiscarded = false;

            await application.save();

            return res.status(200).json({status: "ok"});
        }

        // Если заявка не существует, то создаем новую
        application = await new Application({
            vacancyId: req.body.vacancyId,
            companyId: companyId,
            studentId: req.account._id,
            status: "pending",
            sender: "student",
            coverLetter,
            newCost,
            studentDiscarded: false,
            companyDiscarded: false,
        });
        await application.save();

        // Добавляем вакансию в список вакансий связанных со студентом
        student.vacancies.push(req.body.vacancyId);
        await student.save();

        return res.status(200).json({ status: "ok" });
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

        if (!application.isActive) {
            return res.status(400).send('application inactive, cannot accept');
        }

        // Деактивируем заявки, принять их уже нельзя, отказаться можно если
        // твоя заявка не принята
        Application.updateMany({
            vacancyId: req.body.vacancyId,
            // _id: {
            //     $ne: application._id
            // },
        }, {
            isActive: false
        }, (err) => {
            if (err) {
                console.log(err.message);
            }
            // TODO(zhanadil): нужно правильно обработать ошибку
            // Проблема в том, что запрос к этому моменту может быть завершен
        });

        // Находим вакансию по айди
        var [err, vacancy] = await to(
            Vacancy.findByIdAndRemove(
                req.body.vacancyId
            ).lean()
        );
        if (err) {
            return res.status(500).send(err.message);
        }

        vacancy.maxSalary = application.newCost || vacancy.maxSalary;

        // Переносим задачу в список текущих
        var ongoingTask;
        [err, ongoingTask] = await to(
            new OngoingTask({
                ... vacancy,
                status: 'ongoing',
                freelancerId: req.body.studentId,
            }).save()
        );
        if (err) {
            return res.status(500).send(err.message);
        }

        return res.status(200).send(ongoingTask);
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

        // Принять неактивную заявку нельзя
        if (!application.isActive) {
            return res.status(400).send('application inactive, cannot accept');
        }

        // Деактивируем заявки, принять их уже нельзя, отказаться можно если
        // твоя заявка не принята
        Application.updateMany({
            vacancyId: req.body.vacancyId,
            // _id: {
            //     $ne: application._id
            // },
        }, {
            isActive: false
        }, (err) => {
            if (err) {
                console.log(err.message);
            }
            // TODO(zhanadil): нужно правильно обработать ошибку
            // Проблема в том, что запрос к этому моменту может быть завершен
        });

        // Находим вакансию по айди
        var [err, vacancy] = await to(
            Vacancy.findByIdAndRemove(
                req.body.vacancyId
            ).lean()
        );
        if (err) {
            return res.status(500).send(err.message);
        }

        var ongoingTask;
        [err, ongoingTask] = await to(
            new OngoingTask({
                ... vacancy,
                status: 'ongoing',
                freelancerId: req.account.id,
            }).save()
        );
        if (err) {
            return res.status(500).send(err.message);
        }

        return res.status(200).send(ongoingTask);
    },

    // Компания может отменить заявку если она не была принята.
    // Вместо этого нужно расторгнуть контракт (/company/vacancy/revoke)
    companyCancelApplication: async (req, res, next) => {
        const { vacancyId, studentId } = req.body;
        const vacancyPromise = OngoingTask.findById(vacancyId);
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

        // Находим задачу в списке текущих
        var ongoingTask;
        [err, ongoingTask] = await to(
            vacancyPromise
        );
        if (err) {
            return res.status(500).send(err.message);
        }
        // Если задача нашлась в списке текущих и айди работника над задачей
        // совпадает с работником в заявке, то значит он работает над ней.
        // И отменить заявку он уже не может.
        if (ongoingTask && ongoingTask.freelancerId === studentId) {
            return res.status(400).send('company cannot cancel ongoing application');
        }

        // Компания не может отменить запрос студента, она может его отклонить
        if (application.sender === 'student') {
            return res.status(400).send('company cannot cancel student\'s request');
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
        const vacancyPromise = OngoingTask.findById(vacancyId);
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

        // Находим задачу в списке текущих
        var ongoingTask;
        [err, ongoingTask] = await to(
            vacancyPromise
        );
        if (err) {
            return res.status(500).send(err.message);
        }
        // Если задача нашлась в списке текущих и айди работника над задачей
        // совпадает с айди делающего запрос, то значит он работает над ней.
        // И, отменить заявку он уже не может.
        if (ongoingTask && ongoingTask.freelancerId === req.account._id.toString()) {
            return res.status(400).send('freelancer working on the task cannot cancel it');
        }

        if (application.sender === 'student') {
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
        }

        return res.status(400).send('student cannot cancel company\'s request');
    },

    // Удаляет принятую заявку, реактивирует все остальные и переносит задачу
    // из текущих
    // req.body: {
    //     vacancyId: String,
    //     studentId: String
    // }
    companyRevokeApplication: async (req, res, next) => {
        const { vacancyId, studentId } = req.body;
        var taskPromise = OngoingTask.findByIdAndRemove(vacancyId).lean().exec();
        var applicationPromise = Application.findOneAndRemove({
            vacancyId,
            studentId,
        }).lean().exec();

        // Реактивируем все заявки кроме отмененной
        Application.updateMany({
            vacancyId,
            studentId: {
                $ne: studentId,
            },
        }, {
            isActive: true
        }, (err) => {
            if (err) {
                console.log(err);
            }
        });

        var [err, task] = await to(
            taskPromise
        );
        if (err) {
            return res.status(500).send(err.message);
        }
        if (!task) {
            return res.status(400).send('task not found');
        }
        task.status = undefined;
        task.freelancerId = undefined;

        [err, task] = await to(
            new Vacancy({
                ...task
            }).save()
        );
        if (err) {
            return res.status(500).send(err.message);
        }

        var currentApplication;
        [err, currentApplication] = await to(
            applicationPromise
        );
        if (err) {
            return res.status(500).send(err.message);
        }
        if (!currentApplication) {
            return res.status(400).send('application not found');
        }

        new RevokedApplication({
            ...currentApplication
        }).save((err) => {
            if (err) {
                console.log(err);
            }
        });

        return res.status(200).json({
            task
        });
    },

    companyOngoingTasks: (req, res, next) => {
        OngoingTask.find({
            companyId: req.account.id
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
        OngoingTask.find({
            freelancerId: req.account.id
        }, (err, tasks) => {
            if (err) {
                return res.status(500).send(err.message);
            }

            return res.status(200).json({
                tasks
            });
        })
    },

    // Изменить статус вакансии, requirements для каждого случая брать из statusRequirements.
    // Для того чтобы изменить статус, нынешний статус должен быть из массива requirements.status
    // И отправитель должен быть requirements.sender
    // Пример использования:
    //
    // VacancyController = require('@controllers/vacancy');
    // ...
    // vacancyRouter.post('/accept',
    //    VacancyController.changeStatus(VacancyController.statusRequirements.studentAccepts, 'accepted'));
    changeStatus: (requirements, finalStatus) => {
        // Middleware для роутера.
        // req.body: {
        //      vacancyId: String
        //      studentId: String // (не требуется если запрос идет со стороны самого студента)
        // }
        return async (req, res, next) => {
            // Проверяем от кого исходил запрос, от студента или от компании
            var sender;
            JWT.verify(req.headers.authorization, JWT_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(500).json({error: err.message});
                }
                sender = decoded.sub.type;
            });
            var studentId = (sender === "company" ? req.body.studentId : req.account._id);
            var vacancyId = req.body.vacancyId;
            // Проверяем айди вакансии на действительность
            await Vacancy.findById(vacancyId, (err, vacancy) => {
                if (err) {
                    return res.status(500).json({error: err.message});
                }
                if (!vacancy) {
                    return res.status(400).json({error: "vacancy not found"});
                }
                // Если запрос исходил от компании, то вакансия должна принодлежать только ей
                if (sender == "company" && vacancy.companyId !== req.account._id.toString()) {
                    return res.status(403).json({error: "wrong vacancyId"});
                }
            });

            // Find the student.
            var student = await Student.findById(studentId, (err) => {
                if (err) {
                    return res.status(500).json({error: err.message});
                }
            });
            if (!student) {
                return res.status(400).json({error: "student not found"});
            }

            var application = await Application.findOne(
                    {studentId, vacancyId},
                    (err) => {
                        if (err) {
                            return res.status(500).json({error: err.message});
                        }
                    }
                );

            // Если заявка не существует
            if (!application) {
                return res.status(400).json({
                    error: "application doesn't exist"
                });
            }

            // Принять заявку можно только если заявка отправлена
            // со стороны студента и статус заявки 'pending'
            if (requirements.status !== undefined &&
                    requirements.status.findIndex((element) => {
                        return element === application.status
                    }) === -1) {
                return res.status(409).json({
                    error: `status can't be changed, current status is: ${application.status}`
                });
            }
            if (requirements.sender !== undefined && application.sender !== requirements.sender) {
                return res.status(409).json({
                    error: `status can't be changed, required sender is ${requirements.sender}`
                });
            }
            application.status = finalStatus;
            application.studentDiscarded = false;
            application.companyDiscarded = false;

            await application.save();

            return res.status(200).json({status: "ok"});
        }
    },

    statusRequirements: {
        studentAccept: {
            sender: 'company',
            status: ['pending']
        },
        studentReject: {
            sender: 'company',
            status: ['pending', 'accepted']
        },
        studentCancel: {
            sender: 'student',
            status: ['pending', 'accepted']
        },
        companyAccept: {
            sender: 'student',
            status: ['pending']
        },
        companyReject: {
            sender: 'student',
            status: ['pending', 'accepted']
        },
        companyCancel: {
            sender: 'company',
            status: ['pending', 'accepted']
        },
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
        Vacancy.find({"_id": {"$in": req.account.vacancies}}, (err, vacancies) => {
            if (err) {
                return res.status(500).json({error: err.message});
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
        var applicationsFilter = {};
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
    // Запрос содержит фильтры по мин зп(minSalary), макс зп(maxSalary),
    // область работы(vacancyField), и др.
    // Например: request.filter = {minSalary: 100000, type: ["full-time"]}
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
        var applicationsFilter = {};
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
        [err, applications] = await to(Application.find(applicationsFilter));
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
