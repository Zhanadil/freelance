//During the test the env variable is set to test
require('module-alias/register');

const mongoose = require("mongoose");
const Student = require('@models/student');
const JWT = require('jsonwebtoken');
const { JWT_SECRET } = require('@configuration');

//Require the dev-dependencies
const faker = require('faker');
const config = require('config');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const chaiHttp = require('chai-http');
const server = require('@root/app');
const should = chai.should();

chai.use(chaiHttp);
chai.use(chaiAsPromised);

const expect = chai.expect;

describe('Student post requests', () => {
    const newUser = {
        credentials: {
            method: 'local',
            email: faker.internet.email().toLowerCase(),
            password: faker.internet.password()
        }
    };
    const firstName = faker.name.firstName();
    const lastName = faker.name.lastName();
    const phone = faker.phone.phoneNumber();
    const description = faker.lorem.sentences();
    var token;
    var id;

    before((done) => {
        mongoose.connect(config.DBHost);
        mongoose.connection.dropDatabase(() => {
            var student = new Student(newUser);
            student.save(function(err, savedStudent) {
                token = JWT.sign({
                        iss: 'john',
                        sub: {
                            id: savedStudent.id,
                            email: savedStudent.credentials.email,
                        },
                        iat: Date.now(),
                        exp: new Date().setDate(new Date().getDate() + 1)
                    }, JWT_SECRET);
                id = savedStudent.id;
                done();
            });
        });
    });

    describe('/POST /private', () => {
        describe('first-name', () => {
            it('it should post firstName', (done) => {
                chai.request(server)
                    .post('/student/private/firstName')
                    .set('Authorization', token)
                    .send({'firstName': firstName})
                    .end((err, res) => {
                        expect(err).to.be.null;
                        res.should.have.status(200);
                        res.body.should.be.an('object');
                        res.body.should.have.property('status');
                        expect(res.body.status).to.be.eql('ok');
                        Student.findById(id, function(err, student) {
                            expect(err).to.be.null;
                            expect(student).not.to.be.null;
                            expect(student.firstName).to.be.eql(firstName);
                            done();
                        });
                    });
            });

            it('it shouldn\'t post firstName without token', (done) => {
                chai.request(server)
                    .post('/student/private/firstName')
                    .send({'firstName': firstName})
                    .end((err, res) => {
                        expect(err).to.be.null;
                        res.should.have.status(401);
                        res.should.have.property('text');
                        res.text.should.be.eql('Unauthorized');
                        done();
                    });
            });

            it('it shouldn\'t post firstName without firstName property', (done) => {
                chai.request(server)
                    .post('/student/private/firstName')
                    .set('Authorization', token)
                    .send({})
                    .end((err, res) => {
                        expect(err).to.be.null;
                        res.should.have.status(400);
                        res.body.should.be.an('object');
                        res.body.should.have.property('error');
                        expect(res.body.error).to.be.eql('firstName not received');
                        done();
                    });
            });
        });

        describe('last-name', () => {
            it('it should post lastName', (done) => {
                chai.request(server)
                    .post('/student/private/lastName')
                    .set('Authorization', token)
                    .send({'lastName': lastName})
                    .end((err, res) => {
                        expect(err).to.be.null;
                        res.should.have.status(200);
                        res.body.should.be.an('object');
                        res.body.should.have.property('status');
                        expect(res.body.status).to.be.eql('ok');
                        Student.findById(id, function(err, student) {
                            expect(err).to.be.null;
                            expect(student).not.to.be.null;
                            expect(student.lastName).to.be.eql(lastName);
                            done();
                        });
                    });
            });

            it('it shouldn\'t post lastName without token', (done) => {
                chai.request(server)
                    .post('/student/private/lastName')
                    .send({'lastName': lastName})
                    .end((err, res) => {
                        expect(err).to.be.null;
                        res.should.have.status(401);
                        res.should.have.property('text');
                        res.text.should.be.eql('Unauthorized');
                        done();
                    });
            });

            it('it shouldn\'t post lastName without lastName property', (done) => {
                chai.request(server)
                    .post('/student/private/lastName')
                    .set('Authorization', token)
                    .send({})
                    .end((err, res) => {
                        expect(err).to.be.null;
                        res.should.have.status(400);
                        res.body.should.be.an('object');
                        res.body.should.have.property('error');
                        expect(res.body.error).to.be.eql('lastName not received');
                        done();
                    });
            });
        });

        describe('phone', () => {
            it('it should post phone', (done) => {
                chai.request(server)
                    .post('/student/private/phone')
                    .set('Authorization', token)
                    .send({'phone': phone})
                    .end((err, res) => {
                        expect(err).to.be.null;
                        res.should.have.status(200);
                        res.body.should.be.an('object');
                        res.body.should.have.property('status');
                        expect(res.body.status).to.be.eql('ok');
                        Student.findById(id, function(err, student) {
                            expect(err).to.be.null;
                            expect(student).not.to.be.null;
                            expect(student.phone).to.be.eql(phone);
                            done();
                        });
                    });
            });

            it('it shouldn\'t post phone without token', (done) => {
                chai.request(server)
                    .post('/student/private/phone')
                    .send({'phone': phone})
                    .end((err, res) => {
                        expect(err).to.be.null;
                        res.should.have.status(401);
                        res.should.have.property('text');
                        res.text.should.be.eql('Unauthorized');
                        done();
                    });
            });

            it('it shouldn\'t post phone without phone property', (done) => {
                chai.request(server)
                    .post('/student/private/phone')
                    .set('Authorization', token)
                    .send({})
                    .end((err, res) => {
                        expect(err).to.be.null;
                        res.should.have.status(400);
                        res.body.should.be.an('object');
                        res.body.should.have.property('error');
                        expect(res.body.error).to.be.eql('phone not received');
                        done();
                    });
            });
        });

        describe('description', () => {
            it('it should post description', (done) => {
                chai.request(server)
                    .post('/student/private/description')
                    .set('Authorization', token)
                    .send({'description': description})
                    .end((err, res) => {
                        expect(err).to.be.null;
                        res.should.have.status(200);
                        res.body.should.be.an('object');
                        res.body.should.have.property('status');
                        expect(res.body.status).to.be.eql('ok');
                        Student.findById(id, function(err, student) {
                            expect(err).to.be.null;
                            expect(student).not.to.be.null;
                            expect(student.description).to.be.eql(description);
                            done();
                        });
                    });
            });

            it('it shouldn\'t post description without token', (done) => {
                chai.request(server)
                    .post('/student/private/description')
                    .send({'phone': phone})
                    .end((err, res) => {
                        expect(err).to.be.null;
                        res.should.have.status(401);
                        res.should.have.property('text');
                        res.text.should.be.eql('Unauthorized');
                        done();
                    });
            });

            it('it shouldn\'t post description without description property', (done) => {
                chai.request(server)
                    .post('/student/private/description')
                    .set('Authorization', token)
                    .send({})
                    .end((err, res) => {
                        expect(err).to.be.null;
                        res.should.have.status(400);
                        res.body.should.be.an('object');
                        res.body.should.have.property('error');
                        expect(res.body.error).to.be.eql('description not received');
                        done();
                    });
            });
        });
    });

    after((done) => {
        mongoose.connection.dropDatabase(() => {
            mongoose.disconnect();
            done();
        });
    });
});
