const to = require('await-to-js').default;
const nanoid = require('nanoid');

const Company = require('@models/company');
const Student = require('@models/student');
const mailer = require('@controllers/mailer');
const { hashPassword, signToken } = require('@controllers/helpers');

const signIn = async (user) => {
    var token = await signToken(user);
    var ret = {
        token,
        confirmed: user.credentials.confirmed,
    };
    if ((user instanceof Student) && (user.userType === 'admin')) {
        ret.userType = 'admin';
    }

    return ret;
}

// Company authorization methods controller
module.exports = {
    // Регистрация: требуются почта, пароль и название компании
    companySignUp: async (req, res, next) => {
        const { name, email, password } = req.value.body;

        // Проверяем, что почта не используется
        var err, foundCompany;
        [err, foundCompany] = await to(
            Company.findOne({ 'credentials.email': email })
        );
        if (err) {
            return res.status(500).json({error: err.message});
        }
        if (foundCompany) {
            return res.status(403).json({ error: "Email is already in use" });
        }

        // Создаем токен для подтверждения, он будет выслан по почте
        var confirmationToken = await nanoid();

        // Создаем аккаунт, с неподтвержденной почтой, и добавляем токен для
        // подтверждения
        const hashedPassword = await hashPassword(password);
        const newCompany = new Company({
            credentials: {
                method: 'local',
                email: email,
                password: hashedPassword,
                confirmed: false,
                confirmationToken: confirmationToken,
            },
            name: name,
        });

        // Сохраняем аккаунт и отправляем почту
        await newCompany.save();
        mailer.sendCompanyRegistrationEmail(newCompany);

        // Возвращаем токен для доступа к сайту
        return res.status(200).json(await signIn(newCompany));
    },

    // Подтверждаем аккаунт если ссылка верная
    companyVerify: async (req, res, next) => {
        // Проверяем что компания существует
        var err, company;
        [err, company] = await to(
            Company.findOne({ 'credentials.confirmationToken': req.params.token })
        );
        if (err) {
            return res.status(500).json({error: err.message});
        }
        if (!company) {
            return res.status(204).json({error: "company not found"});
        }

        // Подтверждаем почту
        company.credentials.confirmed = true;
        company.credentials.confirmationToken = undefined;

        // Сохраняем изменения и возвращаем токен
        await company.save();
        return res.status(200).json(await signIn(company));
    },

    companyResendVerification: async (req, res, next) => {
        // Если почта уже подтверждена, то выходим
        if (req.account.credentials.confirmed) {
            return res.status(400).json({
                error: "Email is already confirmed"
            });
        }

        req.account.credentials.confirmationToken = await nanoid();

        await req.account.save();

        // Отправляем письмо с подтверждением
        mailer.sendCompanyRegistrationEmail(req.account);

        // Возвращаем токен для доступа к сайту
        return res.status(200).json({ status: "ok" });
    },

    companySignIn: async (req, res, next) => {
        res.status(200).json(await signIn(req.account));
    },

    // Высылает ссылку на обновление пароля
    companySendForgotPasswordLink: async (req, res, next) => {
        var err, company;
        // Ищем компанию по почте
        [err, company] = await to(
            Company.findOne({
                'credentials.email': req.body.email
            })
        );
        if (err) {
            return res.status(500).json({error: err.message});
        }
        if (!company) {
            return res.status(401).json({error: "email is not used"});
        }

        // Создаем уникальную ссылку для обновления пароля
        //  (практически уникальную, для подтверждения см.
        //  https://www.npmjs.com/package/nanoid)
        company.credentials.forgotPasswordUrl = await nanoid();
        // Устанавливаем время на установку пароля 24 часа
        company.credentials.forgotPasswordExpirationDate =
            new Date(Date.now() + 24*60*60*1000);

        await company.save();

        mailer.sendCompanyForgotPasswordLink(company);

        return res.status(200).json({status: "ok"});
    },

    // Подтверждает, что ссылка на "забыли пароль" верна, но не меняет его
    companyForgotPasswordConfirmation: async (req, res, next) => {
        var err, company;
        // Проверяет, что компания с такой ссылкой существует
        [err, company] = await to(
            Company.findOne({
                'credentials.forgotPasswordUrl': req.params.url
            })
        );
        if (err) {
            return res.status(500).json({error: err.message});
        }
        if (!company) {
            return res.status(400).json({error: "wrong url, company not found"});
        }

        if (!company.credentials.forgotPasswordExpirationDate ||
                new Date() > company.forgotPasswordExpirationDate) {
            company.credentials.forgotPasswordUrl = null;
            company.credentials.forgotPasswordExpirationDate = null;
            await company.save();

            return res.status(403).json({error: "link expired"});
        }

        // Даем компании 10 минут, чтобы заполнить форму нового пароля
        company.credentials.forgotPasswordExpirationDate = new Date(Date.now() + 10*60*1000);
        await company.save();

        return res.status(200).json({status: "ok"});
    },

    // Меняет пароль на новый если компания запрашивала изменение
    companyChangePassword: async (req, res, next) => {
        var err, company;
        // Находит компанию по ссылка изменения пароля
        [err, company] = await to(
            Company.findOne({
                'credentials.forgotPasswordUrl': req.params.url
            })
        )
        if (err) {
            return res.status(500).json({error: err.message});
        }
        if (!company) {
            return res.status(400).json({error: "wrong url, company not found"});
        }

        // Если время на ссылку истекло, то удаляем ссылку и возвращаем ошибку
        if (!company.credentials.forgotPasswordExpirationDate ||
                new Date() > company.credentials.forgotPasswordExpirationDate) {
            company.credentials.forgotPasswordUrl = null;
            company.credentials.forgotPasswordExpirationDate = null;
            await company.save();

            return res.status(403).json({error: "link expired"});
        }

        // Обновляем пароль и удаляем ссылку
        company.credentials.password = await hashPassword(req.body.password);
        company.credentials.forgotPasswordUrl = null;
        company.credentials.forgotPasswordExpirationDate = null;
        await company.save();

        return res.status(200).json(await signIn(company));
    },

    // Sign up a user by google account
    companyGoogleOAuth: async (req, res, next) => {
        res.status(200).json(await signIn(req.account));
    },

    // Регистрация студента по почте и паролю
    studentSignUp: async (req, res, next) => {
        var err, foundStudent;
        const { email, password } = req.value.body;

        // Если почта уже используется, то вернуть ошибку
        [err, foundStudent] = await to(
            Student.findOne({ 'credentials.email': email })
        );
        if (err) {
            return res.status(500).json({error: err.message});
        }
        if (foundStudent) {
            return res.status(403).json({ error: "Email is already in use" });
        }

        const hashedPassword = await hashPassword(password);
        var confirmationToken = await nanoid();

        // Создаем постоянный аккаунт и сохраняем его
        const newStudent = new Student({
            credentials: {
                method: 'local',
                email: email,
                password: hashedPassword,
                confirmed: false,
                confirmationToken: confirmationToken,
            }
        });
        await newStudent.save();

        mailer.sendStudentRegistrationEmail(newStudent);

        // Возвращаем токен
        return res.status(200).json(await signIn(newStudent));
    },

    // Подтверждение аккаунта, если ссылка верная, то переносим данные
    // с временного аккаунта на постоянный
    studentVerify: async (req, res, next) => {
        // Проверяем что студент существует
        var err, student;
        [err, student] = await to(
            Student.findOne({'credentials.confirmationToken': req.params.token})
        );
        if (err) {
            return res.status(500).json({error: err.message});
        }
        if (!student) {
            return res.status(400).json({error: "student not found"});
        }

        // Подтверждаем его почту
        student.credentials.confirmed = true;
        student.credentials.confirmationToken = undefined;

        // Сохраняем и возвращаем токен
        await student.save();
        return res.status(200).json(await signIn(student));
    },

    studentSignIn: async (req, res, next) => {
        return res.status(200).json(await signIn(req.account));
    },

    studentResendVerification: async (req, res, next) => {
        // Если почта уже подтверждена, то выходим
        if (req.account.credentials.confirmed) {
            return res.status(400).json({
                error: "Email is already confirmed"
            });
        }

        req.account.credentials.confirmationToken = await nanoid();

        await req.account.save();

        // Отправляем письмо с подтверждением
        mailer.sendStudentRegistrationEmail(req.account);

        // Возвращаем токен для доступа к сайту
        return res.status(200).json({ status: "ok" });
    },

    // Высылает ссылку на обновление пароля
    studentSendForgotPasswordLink: async (req, res, next) => {
        var err, student;
        // Ищем студента по почте
        [err, student] = await to(
            Student.findOne({
                'credentials.email': req.body.email
            })
        );
        if (err) {
            return res.status(500).json({error: err.message});
        }
        if (!student) {
            return res.status(401).json({error: "email is not used"});
        }

        // Создаем уникальную(практически,
        //  для подтверждения см.
        //  https://www.npmjs.com/package/nanoid) ссылку для обновления пароля
        student.credentials.forgotPasswordUrl = await nanoid();
        // Устанавливаем время на установку пароля 24 часа
        student.credentials.forgotPasswordExpirationDate = new Date(Date.now() + 24*60*60*1000);

        await student.save();

        mailer.sendStudentForgotPasswordLink(student);

        return res.status(200).json({status: "ok"});
    },

    // Подтверждает, что ссылка на "забыли пароль" верна, но не меняет его
    studentForgotPasswordConfirmation: async (req, res, next) => {
        var err, student;
        // Ищет, что студент с такой ссылкой существует
        [err, student] = await to(
            Student.findOne({
                'credentials.forgotPasswordUrl': req.params.url
            })
        );
        if (err) {
            return res.status(500).json({error: err.message});
        }
        if (!student) {
            return res.status(400).json({error: "wrong url, student not found"});
        }

        if (!student.credentials.forgotPasswordExpirationDate ||
                new Date() > student.forgotPasswordExpirationDate) {
            student.credentials.forgotPasswordUrl = null;
            student.credentials.forgotPasswordExpirationDate = null;
            await student.save();

            return res.status(403).json({error: "link expired"});
        }

        // Даем студенту 10 минут, чтобы заполнить форму нового пароля
        student.credentials.forgotPasswordExpirationDate = new Date(Date.now() + 10*60*1000);
        await student.save();

        return res.status(200).json({status: "ok"});
    },

    // Меняет пароль на новый если студент запрашивал изменение
    studentChangePassword: async (req, res, next) => {
        var err, student;
        // Находит студента по ссылка изменения пароля
        [err, student] = await to(
            Student.findOne({
                'credentials.forgotPasswordUrl': req.params.url
            })
        )
        if (err) {
            return res.status(500).json({error: err.message});
        }
        if (!student) {
            return res.status(400).json({error: "wrong url, student not found"});
        }

        // Если время на ссылку истекло, то удаляем ссылку и возвращаем ошибку
        if (!student.credentials.forgotPasswordExpirationDate ||
                new Date() > student.credentials.forgotPasswordExpirationDate) {
            student.credentials.forgotPasswordUrl = null;
            student.credentials.forgotPasswordExpirationDate = null;
            await student.save();

            return res.status(403).json({error: "link expired"});
        }

        // Обновляем пароль и удаляем ссылку
        student.credentials.password = await hashPassword(req.body.password);
        student.credentials.forgotPasswordUrl = null;
        student.credentials.forgotPasswordExpirationDate = null;
        await student.save();

        return res.status(200).json(await signIn(student));
    },

    // Sign up a user by google account
    studentGoogleOAuth: async (req, res, next) => {
        return res.status(200).json(await signIn(req.account));
    },
};
