const to = require('await-to-js');
const mailer = require('nodemailer');

const senderEmail = 'znurtoleuov@gmail.com';

var transporter = mailer.createTransport({
  service: 'gmail',
  auth: {
    user: senderEmail,
    pass: '3.3&d6Q,oL'
  }
});

module.exports = {
    sendMail: (email, subject, message) => {
        var mailOptions = {
            from: senderEmail,
            to: email,
            subject, subject,
            text: message,
        };

        transporter.sendMail(mailOptions, function(error, info){
            if (error) {
                return null;
            }
            return info;
        });
    },

    sendStudentRegistrationEmail: (student) => {
        if (!student || student.credentials.confirmed) {
            return;
        }

        var mailOptions = {
            from: senderEmail,
            to: student.credentials.email,
            subject: 'Добро пожаловать на love2work',
            text: `Спасибо, что выбрали наш сайт, чтобы подтвердить свой почтовый адрес пройдите по ссылке love2work.kz:3000/student/auth/verify/${student.credentials.confirmationToken}`,
        };

        transporter.sendMail(mailOptions, function(error, info){
            if (error) {
                return null;
            }
            return info;
        });
    },

    sendCompanyRegistrationEmail: (company) => {
        if (!company || company.credentials.confirmed) {
            return;
        }

        var mailOptions = {
            from: senderEmail,
            to: company.credentials.email,
            subject: 'Добро пожаловать на love2work',
            text: `Спасибо, что выбрали наш сайт, чтобы подтвердить свой почтовый адрес пройдите по ссылке love2work.kz:3000/company/auth/verify/${company.credentials.confirmationToken}`,
        };

        transporter.sendMail(mailOptions, function(error, info){
            if (error) {
                return null;
            }
            return info;
        });
    },

    sendStudentForgotPasswordLink: (student) => {
        var mailOptions = {
            from: senderEmail,
            to: student.credentials.email,
            subject: 'Запрос на изменение пароля',
            text: `Доброго времени суток!\n\nНам пришел запрос на изменение пароля на вашем аккаунте.\nЕсли вы понятия не имеете о чем это письмо, то можете смело его проигнорировать.\nВ обратном случае пройдите по ссылке love2work.kz:3000/student/auth/confirm-forgot-password/${student.credentials.forgotPasswordUrl}\n\nСпасибо за внимание!`,
        };

        transporter.sendMail(mailOptions, function(error, info){
            if (error) {
                //TODO(zhanadil): resolve error
                return null;
            }
            return info;
        });
    },

    sendCompanyForgotPasswordLink: (company) => {
        var mailOptions = {
            from: senderEmail,
            to: company.credentials.email,
            subject: 'Запрос на изменение пароля',
            text: `Доброго времени суток!\n\nНам пришел запрос на изменение пароля на вашем аккаунте.\nЕсли вы понятия не имеете о чем это письмо, то можете смело его проигнорировать.\nВ обратном случае пройдите по ссылке love2work.kz:3000/company/auth/confirm-forgot-password/${company.credentials.forgotPasswordUrl}\n\nСпасибо за внимание!`,
        };

        transporter.sendMail(mailOptions, function(error, info){
            if (error) {
                //TODO(zhanadil): resolve error
                return null;
            }
            return info;
        });
    },

    sendEmployeeInvitation: (company) => {
        var mailOptions = {
            from: senderEmail,
            to: company.credentials.email,
            subject: 'Приглашение на регистрацию',
            text: `Доброго времени суток!\nНа вашу почту было выслано приглашение на регистрацию как сотрудник компании "${company.name}".\nЧтобы подтвердить свой почтовый адрес пройдите по ссылке:\nlove2work.kz:3000/company/employee/verify/${company.credentials.confirmationToken}`
        };

        transporter.sendMail(mailOptions, function(error, info){
            if (error) {
                //TODO(zhanadil): resolve error
                return null;
            }
            return info;
        });
    }
};
