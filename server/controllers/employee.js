const nanoid = require('nanoid');
const to = require('await-to-js').default;
const { hashPassword, signIn, signToken } = require('@controllers/helpers');

const Company = require('@models/company');

const mailer = require('@controllers/mailer');

module.exports = {
    newEmployee: async (req, res, next) => {
        if (!req.user.isMain) {
            return res.status(400).send('only main account can signup employees');
        }

        const { email } = req.body;

        // Проверяем, что почта не используется
        var err, foundCompany;
        [err, foundCompany] = await to(
            Company.findOne({
                // В отличии от обычной регистрации, не проверяем на схожесть в
                // названиях компаний, так как название компании сотрудника и
                // главного аккаунта будет совпадать
                'credentials.email': email
            })
        );
        if (err) {
            return res.status(500).send(err.message);
        }
        if (foundCompany) {
            return res.status(403).send("Email is already in use");
        }

        // Создаем токен для подтверждения, он будет выслан по почте
        var confirmationToken = await nanoid();

        // Создаем аккаунт, с неподтвержденной почтой, и добавляем секретный код
        // для подтверждения
        const newCompany = new Company({
            credentials: {
                method: 'local',
                email,
                confirmed: false,
                confirmationToken,
            },
            name: req.user.name,
            isMain: false,
            employeeInfo: {
                parentId: req.user.id,
            },
        });

        // Сохраняем аккаунт и отправляем почту
        [err] = await to(
            newCompany.save()
        );
        if (err) {
            return res.status(500).send(err.message);
        }

        mailer.sendEmployeeInvitation(newCompany);

        // Возвращаем токен для доступа к сайту
        return res.status(200).send('link sent');
    },

    newEmployeeCodeConfirmation: async (req, res, next) => {
        var [err, company] = await to(
            Company.findOne({
                'credentials.confirmationToken': req.params.code
            })
        );
        if (err) {
            return res.status(500).send(err.message);
        }
        if (!company) {
            return res.status(400).send("wrong code!");
        }

        return res.status(200).send('ok');
    },

    newEmployeeSignUp: async (req, res, next) => {
        var [err, company] = await to(
            Company.findOne({
                'credentials.confirmationToken': req.body.code
            })
        );
        if (err) {
            return res.status(500).send(err.message);
        }
        if (!company) {
            return res.status(400).send("wrong code!");
        }

        company.credentials.confirmed = true;
        company.credentials.password = await hashPassword(req.body.password);
        company.employeeInfo.firstName = req.body.firstName;
        company.employeeInfo.lastName = req.body.lastName;
        company.employeeInfo.position = req.body.position;

        [err] = await to(
            company.save()
        );
        if (err) {
            return res.status(500).send(err.message);
        }

        return res.status(200).json(await signIn(company));
    }
};
