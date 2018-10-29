const socketio = require('socket.io');
const jwt = require('jsonwebtoken');
const to = require('await-to-js').default;

const Student = require('@models/student');
const { Company } = require('@models/company');
const { Conversation, Message } = require('@models/chat');

const helpers = require('@socket-controllers/helpers');

// Вспомогательная функция для доступа к документа диалога
const findConversation = async (conversationId, userType, userId, receiverId) => {
    // Проверка на существование чата по айди
    var err, conversation = null;
    if (conversationId) {
        [err, conversation] = await to(
            Conversation.findById(conversationId)
        );
        if (err) {
            throw err;
        }
    }

    if (conversation) {
        return conversation;
    }

    // Если айди получателя не указан, то возвращаем ошибку
    if (!receiverId) {
        throw new Error("conversation not found");
    }

    var companyId, studentId, companyName;
    if (userType === 'company') {
        companyId = userId;
        studentId = receiverId;
    } else {
        companyId = receiverId;
        studentId = userId;
    }

    // Находим чат по собеседникам
    [err, conversation] = await to(
        Conversation.findOne({
            'company.id': companyId,
            'student.id': studentId,
        })
    );
    if (err) {
        throw err;
    }

    // Если не нашли и так, то создаем новый
    if (!conversation) {
        const companyPromise = Company.findById(companyId).exec();
        const studentPromise = Student.findById(studentId).exec();
        var err, company, student;
        [err, company] = await to(
            companyPromise
        );
        if (err) {
            throw err;
        }
        [err, student] = await to(
            studentPromise
        );
        if (err) {
            throw err;
        }
        if (!company) {
            throw new Error('company not found');
        }
        if (!student) {
            throw new Error('student not found');
        }

        [err, conversation] = await to(
            new Conversation({
                company: {
                    id: companyId,
                    isMain: company.isMain,
                    firstName: company.employeeInfo.firstName,
                    lastName: company.employeeInfo.lastName,
                    position: company.employeeInfo.position,
                },
                student: {
                    id: studentId,
                    firstName: student.firstName,
                    lastName: student.lastName,
                },
            }).save()
        );
        if (err) {
            throw err;
        }
    }

    return conversation;
}

const onReceiveMessage = (socket, data) => {
    // Контроль получения сообщений
    // {
    //     conversationId: String,
    //     receiverId: String,
    //     messageType: enum('text', 'image', 'document'),
    //     text: String,
    //     timeSent: Date,
    // }
    socket.on('chat_message', async (message, returnCall) => {
        // Валидация входных данных
        const validateResult =
            helpers.validateBody(helpers.receiveMessageSchema, message);
        if (validateResult) {
            returnCall({
                status: 'error',
                message: validateResult,
            });
            return;
        }

        var [err, conversation] = await to(
            findConversation(
                message.conversationId,
                data.userType,
                data.userId,
                message.receiverId,
            )
        );
        if (err) {
            returnCall({
                status: 'error',
                message: err.message,
            });
            return;
        }
        if (!message.conversationId) {
            message.conversationId = conversation.id;
        }

        // Добавляем сообщение в базу данных
        var [err, chatMessage] = await to(
            new Message({
                messageType: message.messageType,
                authorId: data.userId,
                authorType: data.userType,
                conversationId: message.conversationId,
                text: message.text,
                timeSent: message.timeSent,
            }).save()
        );
        if (err) {
            returnCall({
                status: 'error',
                message: err.message,
            });
            return;
        }

        conversation.lastMessage = chatMessage;
        [err, conversation] = await to(
            conversation.save()
        );
        if (err) {
            returnCall({
                status: 'error',
                message: err.message,
            });
            return;
        }

        // Находим тип и айди получателя
        var receiverType;
        if (data.userType === 'company') {
            receiverType = 'student';
        } else if (data.userType === 'student') {
            receiverType = 'company';
        }

        if (!message.receiverId) {
            if (receiverType === 'student') {
                message.receiverId = conversation.studentId;
            } else if (receiverType === 'company') {
                message.receiverId = conversation.companyId;
            }
        }

        // Отправляем сообщение в комнату получателя
        socket.in(receiverType + message.receiverId).emit('chat_message', chatMessage);

        returnCall({
            status: 'ok',
            conversationId: message.conversationId,
        });
    });
}

module.exports = {
    control: (socket, data) => {
        onReceiveMessage(socket, data);
    }
}
