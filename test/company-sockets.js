require('module-alias/register');

const config = require('config');
const mongoose = require("mongoose");
const Company = require('@models/company');
const Student = require('@models/student');
const { Message, Conversation } = require('@models/chat');
const JWT = require('jsonwebtoken');
const { JWT_SECRET } = require('@configuration');
const { signToken } = require('@controllers/helpers');
const to = require('await-to-js').default;

const server = require('@root/app');

const faker = require('faker');
const chai = require('chai');
const io = require('socket.io-client');
const should = chai.should();

const expect = chai.expect;

const socketURL = 'http://0.0.0.0:7000';

const options ={
  transports: ['websocket'],
  'force new connection': true
};

const newStudent = {
    credentials: {
        method: 'local',
        email: faker.internet.email().toLowerCase(),
        password: faker.internet.password(),
    },
};

const newStudent2 = {
    credentials: {
        method: 'local',
        email: faker.internet.email().toLowerCase(),
        password: faker.internet.password(),
    },
};

const newCompany = {
    credentials: {
        method: 'local',
        email: faker.internet.email().toLowerCase(),
        password: faker.internet.password(),
    },
    name: faker.company.companyName(),
};

const newCompany2 = {
    credentials: {
        method: 'local',
        email: faker.internet.email().toLowerCase(),
        password: faker.internet.password(),
    },
    name: faker.company.companyName(),
};

describe('student socket tests', () => {
    var studentToken, studentToken2, companyToken, companyToken2;
    var studentId, studentId2, companyId, companyId2;

    before(async () => {
        server.listen(7000);

        mongoose.connect(config.DBHost, { useNewUrlParser: true });
        await mongoose.connection.dropDatabase();

        var [err, student] = await to(
            new Student(newStudent).save()
        );
        expect(err).to.be.null;
        studentToken = await signToken(student);
        studentId = student.id;

        [err, student] = await to(
            new Student(newStudent2).save()
        );
        expect(err).to.be.null;
        studentToken2 = await signToken(student);
        studentId2 = student.id;

        var company;
        [err, company] = await to(
            new Company(newCompany).save()
        );
        expect(err).to.be.null;
        companyToken = await signToken(company);
        companyId = company.id;

        [err, company] = await to(
            new Company(newCompany2).save()
        );
        expect(err).to.be.null;
        companyToken2 = await signToken(company);
        companyId2 = company.id;
    });

    describe('connection', () => {
        it('should connect with correct token', (done) => {
            const client = io.connect(socketURL);
            var didConnect = false;

            client.on('connect', function() {
                client.on('authenticated', function() {
                    didConnect = true;
                    client.disconnect();
                    done();
    			});
    			client.on('unauthorized', function() {
                    // Возвращаем ошибку, как только он не смог авторизироваться
    				expect(0, 1);
				});

                client.emit('authentication', { token: companyToken });
            });
            client.on('disconnect', function() {
                expect(didConnect).to.be.true;
            })
        });
    });

    describe('chat', () => {
        var conversationId;

        it('should not send private text message to anyone except receiver via receiverid', (done) => {
            const studentClient = io.connect(socketURL);
            const studentClient2 = io.connect(socketURL);
            const companyClient = io.connect(socketURL);
            const companyClient2 = io.connect(socketURL);

            const sentMessage = {
                messageType: 'text',
                receiverId: studentId,
                text: "test message",
                timeSent: Date.now(),
            };

            const receivedMessage = {
                messageType: 'text',
                authorId: companyId,
                text: sentMessage.text,
            };

            const completeTest = function() {
                studentClient.disconnect();
                studentClient2.disconnect();
                companyClient.disconnect();
                companyClient2.disconnect();
                done();
            }

            const checkPrivateMessage = function(client) {
                client.on('chat_message', function(msg) {
                    msg.should.deep.include(receivedMessage);
                    expect(new Date(msg.timeSent).getDate()).to.equal(new Date(sentMessage.timeSent).getDate());
                    // Получатель должен быть только студентом один
                    client.should.equal(studentClient);
                    // Даем лишнее время, чтобы ошибочные сообщения успели придти
                    setTimeout(completeTest, 40);
                });
            }

            studentClient.on('connect', function() {
                studentClient.emit('authentication', { token: studentToken });

                checkPrivateMessage(studentClient);

                studentClient2.on('connect', function() {
                    studentClient2.emit('authentication', { token: studentToken2 });

                    checkPrivateMessage(studentClient2);
                });

                companyClient2.on('connect', function() {
                    companyClient2.emit('authentication', { token: companyToken2 });

                    checkPrivateMessage(companyClient2);
                });

                companyClient.on('connect', function() {
                    companyClient.emit('authentication', { token: companyToken });

                    checkPrivateMessage(companyClient);

                    companyClient.on('authenticated', function() {
                        companyClient.emit('chat_message', sentMessage, (returnMessage) => {
                            Conversation.findById(returnMessage.conversationId, (err, conversation) => {
                                expect(conversation.companyId).equal(companyId);
                                expect(conversation.studentId).equal(studentId);
                                expect(conversation.lastMessage)
                                    .deep.include({
                                        authorId: companyId,
                                        authorType: "company",
                                        messageType: "text",
                                        text: sentMessage.text,
                                    });
                                expect(new Date(conversation.lastMessage.timeSent).getDate())
                                    .to.equal(new Date(sentMessage.timeSent).getDate());

                                returnMessage.should.deep.equal({
                                    status: "ok",
                                    conversationId: conversation.id,
                                });
                            });
                        });
                    });
                });
    		});
        });

        it('should create conversation after first private message', (done) => {
            const companyClient2 = io.connect(socketURL);

            const sentMessage = {
                messageType: 'text',
                receiverId: studentId2,
                text: "test message 2",
                timeSent: Date.now(),
            };

            companyClient2.on('connect', function() {
                companyClient2.emit('authentication', { token: companyToken2 });

                companyClient2.on('authenticated', function() {
                    companyClient2.emit('chat_message', sentMessage, (returnMessage) => {
                        Conversation.findOne({
                            companyId: companyId2,
                            studentId: studentId2,
                        }, (err, conversation) => {
                            expect(err).to.be.null;
                            expect(conversation).not.to.be.null;
                            conversationId = conversation.id;

                            returnMessage.should.deep.equal({
                                status: "ok",
                                conversationId,
                            });

                            companyClient2.disconnect();
                            done();
                        })
                    });
                })
            });
        });

        it('should update lastMessage in Conversation', (done) => {
            const studentClient2 = io.connect(socketURL);

            const sentMessage = {
                messageType: 'text',
                conversationId,
                text: "test last-message update",
                timeSent: Date.now(),
            };

            studentClient2.on('connect', function() {
                studentClient2.emit('authentication', { token: studentToken2 });

                // Отправляем сообщение
                studentClient2.emit('chat_message', sentMessage, (returnMessage) => {
                    // Проверяем изменилось-ли последнее сообщение в чате
                    Conversation.findById(conversationId, (err, conversation) => {
                        expect(err).to.be.null;
                        expect(conversation.lastMessage.text).to.be.equal(sentMessage.text);
                        returnMessage.should.deep.equal({
                            status: "ok",
                            conversationId: conversation.id,
                        });
                        studentClient2.disconnect();
                        done();
                    });
                });
            });
        });


        it('should not send private text message to anyone except receiver via conversationid', (done) => {
            const studentClient = io.connect(socketURL);
            const studentClient2 = io.connect(socketURL);
            const companyClient = io.connect(socketURL);
            const companyClient2 = io.connect(socketURL);

            const sentMessage = {
                messageType: 'text',
                conversationId,
                text: "test message 3",
                timeSent: Date.now(),
            };

            const receivedMessage = {
                messageType: 'text',
                authorId: companyId2,
                text: sentMessage.text,
            };

            const completeTest = function() {
                studentClient.disconnect();
                studentClient2.disconnect();
                companyClient.disconnect();
                companyClient2.disconnect();
                done();
            }

            const checkPrivateMessage = function(client) {
                client.on('chat_message', function(msg) {
                    msg.should.deep.include(receivedMessage);
                    expect(new Date(msg.timeSent).getDate()).to.equal(new Date(sentMessage.timeSent).getDate());
                    // Получатель должен быть только студентом один
                    client.should.equal(studentClient2);
                    // Даем лишнее время, чтобы ошибочные сообщения успели придти
                    setTimeout(completeTest, 40);
                });
            }

            studentClient.on('connect', function() {
                studentClient.emit('authentication', { token: studentToken });

                checkPrivateMessage(studentClient);

                studentClient2.on('connect', function() {
                    studentClient2.emit('authentication', { token: studentToken2 });

                    checkPrivateMessage(studentClient2);
                });

                companyClient.on('connect', function() {
                    companyClient.emit('authentication', { token: companyToken });

                    checkPrivateMessage(companyClient);
                });

                companyClient2.on('connect', function() {
                    companyClient2.emit('authentication', { token: companyToken2 });

                    checkPrivateMessage(companyClient2);

                    companyClient2.on('authenticated', function() {
                        companyClient2.emit('chat_message', sentMessage, (returnMessage) => {
                            returnMessage.should.deep.equal({
                                status: "ok",
                                conversationId,
                            });
                        });
                    });
                });
    		});
        });
    });

    after(async () => {
        await server.close();
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
    });
});
