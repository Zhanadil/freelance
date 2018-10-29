const mailer = require('nodemailer');

const { Company } = require('@models/company');
const Student = require('@models/student');

class Mailer {
    init(email, pass, service = 'gmail') {
        this.email = email;
        this.pass = pass;
        this.service = service;

        this.transporter = mailer.createTransport({
            service: this.service,
            auth: {
                user: this.email,
                pass: this.pass
            }
        });
    }

    sendMail(email, subject, message) {
        let mailOptions = {
            from: this.email,
            to: email,
            subject, subject,
            text: message,
        };

        this.transporter.sendMail(mailOptions);
    }

    sendStudentRegistrationEmail(student) {
        if (!student || !(student instanceof Student)) {
            return;
        }
        if (student.credentials.confirmed) {
            return;
        }

        this.sendMail(
            student.credentials.email,
            'Добро пожаловать на love2work',
            `Спасибо, что выбрали наш сайт, чтобы подтвердить свой почтовый адрес пройдите по ссылке love2work.kz:3000/student/auth/verify/${student.credentials.confirmationToken}`
        );
    }

    sendCompanyRegistrationEmail(company) {
        if (!company || !(company instanceof Company)) {
            return;
        }
        if (company.credentials.confirmed) {
            return;
        }

        this.sendMail(
            company.credentials.email,
            'Добро пожаловать на love2work',
            `Спасибо, что выбрали наш сайт, чтобы подтвердить свой почтовый адрес пройдите по ссылке love2work.kz:3000/company/auth/verify/${company.credentials.confirmationToken}`
        );
    }

    sendStudentForgotPasswordLink(student) {
        if (!student || !(student instanceof Student)) {
            return;
        }

        this.sendMail(
            student.credentials.email,
            'Запрос на изменение пароля',
            `Доброго времени суток!\n\nНам пришел запрос на изменение пароля на вашем аккаунте.\nЕсли вы понятия не имеете о чем это письмо, то можете смело его проигнорировать.\nВ обратном случае пройдите по ссылке love2work.kz:3000/student/auth/confirm-forgot-password/${student.credentials.forgotPasswordUrl}\n\nСпасибо за внимание!`
        );
    }

    sendCompanyForgotPasswordLink(company) {
        if (!company || !(company instanceof Company)) {
            return;
        }

        this.sendMail(
            company.credentials.email,
            'Запрос на изменение пароля',
            `Доброго времени суток!\n\nНам пришел запрос на изменение пароля на вашем аккаунте.\nЕсли вы понятия не имеете о чем это письмо, то можете смело его проигнорировать.\nВ обратном случае пройдите по ссылке love2work.kz:3000/company/auth/confirm-forgot-password/${company.credentials.forgotPasswordUrl}\n\nСпасибо за внимание!`
        );
    }

    sendEmployeeInvitation(company) {
        if (!company || !(company instanceof Company)) {
            return;
        }
        if (company.credentials.confirmed) {
            return;
        }

        this.sendMail(
            company.credentials.email,
            'Приглашение на регистрацию',
            `Доброго времени суток!\nНа вашу почту было выслано приглашение на регистрацию как сотрудник компании "${company.name}".\nЧтобы подтвердить свой почтовый адрес пройдите по ссылке:\nlove2work.kz:3000/company/employee/verify/${company.credentials.confirmationToken}`
        );
    }
}

module.exports = new Mailer();
