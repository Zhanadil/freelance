const joi = require('joi');

const { Message } = require('@models/chat');

// Валидация отправки сообщений в чате
const receiveMessageSchema = joi.object().keys({
    conversationId: joi.string(),
    receiverId: joi.string(),
    messageType: joi.string().valid(
        Message.schema.paths.messageType.enumValues
    ).required(),
    text: joi.string(),
    timeSent: joi.date(),
});

module.exports = {
    // Вспомогательная функция для валидации
    validateBody: (schema, body) => {
        const result = joi.validate(body, schema);
        if (result.error) {
            return result.error;
        }
        return null;
    },

    // Схемы для валидации сообщений с сокетов
    receiveMessageSchema,
};
