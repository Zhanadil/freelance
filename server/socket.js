const socketio = require('socket.io');
const jwt = require('jsonwebtoken');
const to = require('await-to-js').default;

const JWT_SECRET = require('config').get('JWT_SECRET');

const Student = require('@models/student');
const { Company } = require('@models/company');

const ChatController = require('@socket-controllers/chat');

var io;

const authenticate = async (socket, data, callback) => {
    var decoded;
    try {
        decoded = jwt.verify(data.token, JWT_SECRET);
    } catch(err) {
        return callback(new Error("fake token"));
    }

    data.userType = decoded.sub.type;
    data.userId = decoded.sub.id;

    if (decoded.sub.type === 'student') {
        const [err, student] = await to(
            Student.findById(decoded.sub.id)
        );

        if (err || !student) return callback(new Error("Student not found"));
        return callback(null, true);
    } else if (decoded.sub.type === 'company') {
        const [err, company] = await to(
            Company.findById(decoded.sub.id)
        );

        if (err || !company) return callback(new Error("Company not found"));
        return callback(null, true);
    }

    return callback(new Error("wrong user type"));
}

const postAuthenticate = async (socket, data) => {
    // Когда пользователь подсоединился, добавляем его в свою комнату.
    // Это сделано для того, чтобы все вкладки(у которых разные сокеты) получали
    // сообщения от сервера.
    socket.join(data.userType + data.userId);

    ChatController.control(socket, data);
}

const disconnect = async (socket) => {
    // Пока ничего не нужно делать при отсоединении
}

module.exports = (server, sockets) => {
    io = socketio(server);

    require('socketio-auth')(io, {
        authenticate,
        postAuthenticate,
        disconnect,
    });
}
