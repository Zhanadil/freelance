//During the test the env variable is set to test
require('module-alias/register');

const mongoose = require("mongoose");
const Student = require('@models/student');
const Company = require('@models/company');
const { Message, Conversation } = require('@models/chat');
const JWT = require('jsonwebtoken');
const { JWT_SECRET } = require('@configuration');
const to = require('await-to-js').default;
const { signToken } = require('@controllers/helpers');

//Require the dev-dependencies
const faker = require('faker');
const config = require('config');
const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('@root/app');
const should = chai.should();

chai.use(chaiHttp);

const expect = chai.expect;

describe('Student private requests', () => {
    const newStudent = {
        credentials: {
            method: 'local',
            email: faker.internet.email().toLowerCase(),
            password: faker.internet.password()
        }
    };
    const newStudent2 = {
        credentials: {
            method: 'local',
            email: faker.internet.email().toLowerCase(),
            password: faker.internet.password()
        }
    }
    var studentToken, studentToken2;
    var studentId, studentId2;

    const newCompany = {
        credentials: {
            method: 'local',
            email: faker.internet.email().toLowerCase(),
            password: faker.internet.password(),
        },
        name: faker.company.companyName(),
    };
    var companyToken, companyId;

    var conversationId;

    before(async () => {
        await mongoose.connect(config.DBHost, { useNewUrlParser: true });
        await mongoose.connection.dropDatabase()

        // Создаем студентов
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

        // Создаем компанию
        var company;
        [err, company] = await to(
            new Company(newCompany).save()
        );
        expect(err).to.be.null;
        companyToken = await signToken(company);
        companyId = company.id;

        // Создаем чат
        var conversation;
        [err, conversation] = await to(
            new Conversation({
                studentId,
                companyId,
            }).save()
        );
        expect(err).to.be.null;
        conversationId = conversation.id;

        for (var i = 1;i <= 2;++i) {
            var [err, message] = await to(
                new Message({
                    authorId: studentId,
                    authorType: 'student',
                    conversationId,
                    messageType: 'text',
                    text: 'student' + i.toString(),
                    timeSent: Date.now(),
                }).save()
            )
            expect(err).to.be.null;

            [err, message] = await to(
                new Message({
                    authorId: companyId,
                    authorType: 'company',
                    conversationId,
                    messageType: 'text',
                    text: 'company' + i.toString(),
                    timeSent: Date.now(),
                }).save()
            )
            expect(err).to.be.null;
        }
    });

    describe('/chat', () => {
        describe('get chat', () => {
            it('should not get chat messages without token', (done) => {
                chai.request(server)
                    .get(`/student/chat/${conversationId}/_/20`)
                    .end((err, res) => {
                        expect(err).to.be.null;
                        res.should.have.status(401);
                        res.should.have.property('text');
                        res.text.should.be.eql('Unauthorized');
                        done();
                    });
            });

            it('should not get chat messages with another student\'s token', (done) => {
                chai.request(server)
                    .get(`/student/chat/${conversationId}/_/20`)
                    .set('Authorization', studentToken2)
                    .end((err, res) => {
                        expect(err).to.be.null;
                        res.should.have.status(403);
                        res.body.error.should.be.eql('not authorized for this conversation');
                        done();
                    });
            });

            var cursorId;

            it('should get messages with correct token', (done) => {
                chai.request(server)
                    .get(`/student/chat/${conversationId}/_/2`)
                    .set('Authorization', studentToken)
                    .end((err, res) => {
                        expect(err).to.be.null;
                        res.should.have.status(200);
                        res.body.should.have.property('messages');
                        res.body.messages.length.should.be.equal(2);
                        res.body.messages[0].text.should.be.equal('company2');
                        res.body.messages[1].text.should.be.equal('student2');
                        cursorId = res.body.messages[1]._id;
                        done();
                    });
            });

            it('should get messages with cursor id', (done) => {
                chai.request(server)
                    .get(`/student/chat/${conversationId}/${cursorId}/3`)
                    .set('Authorization', studentToken)
                    .end((err, res) => {
                        expect(err).to.be.null;
                        res.should.have.status(200);
                        res.body.should.have.property('messages');
                        res.body.messages.length.should.be.equal(2);
                        res.body.messages[0].text.should.be.equal('company1');
                        res.body.messages[1].text.should.be.equal('student1');
                        done();
                    });
            });
        });

        describe('get last-message', () => {
            it('should not get chat messages without token', (done) => {
                chai.request(server)
                    .get(`/student/chat/last-message/${conversationId}`)
                    .end((err, res) => {
                        expect(err).to.be.null;
                        res.should.have.status(401);
                        res.should.have.property('text');
                        res.text.should.be.eql('Unauthorized');
                        done();
                    });
            });

            it('should not get chat messages with another student\'s token', (done) => {
                chai.request(server)
                    .get(`/student/chat/last-message/${conversationId}`)
                    .set('Authorization', studentToken2)
                    .end((err, res) => {
                        expect(err).to.be.null;
                        res.should.have.status(403);
                        res.body.error.should.be.eql('not authorized for this conversation');
                        done();
                    });
            });

            it('should get messages with correct token', (done) => {
                chai.request(server)
                    .get(`/student/chat/last-message/${conversationId}`)
                    .set('Authorization', studentToken)
                    .end((err, res) => {
                        expect(err).to.be.null;
                        res.should.have.status(200);
                        res.body.should.have.property('message');
                        res.body.message.text.should.be.equal('company2');
                        done();
                    });
            });
        });

        describe('get conversations', () => {
            it('should not get conversations without token', (done) => {
                chai.request(server)
                    .get(`/student/chat/conversations`)
                    .end((err, res) => {
                        expect(err).to.be.null;
                        res.should.have.status(401);
                        res.should.have.property('text');
                        res.text.should.be.eql('Unauthorized');
                        done();
                    });
            });

            it('should get conversations with correct token', (done) => {
                chai.request(server)
                    .get(`/student/chat/conversations`)
                    .set('Authorization', studentToken)
                    .end((err, res) => {
                        expect(err).to.be.null;
                        res.should.have.status(200);
                        res.body.should.have.property('conversations');
                        res.body.conversations.length.should.be.equal(1);
                        res.body.conversations[0]._id.should.be.equal(conversationId);
                        done();
                    });
            });
        });
    });

    after(async () => {
        await mongoose.connection.dropDatabase()
        await mongoose.disconnect();
    });
});
