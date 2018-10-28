//During the test the env variable is set to test
require('module-alias/register');

const mongoose = require("mongoose");
const Company = require('@models/company');
const Student = require('@models/student');
const Vacancy = require('@models/vacancy');
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

describe('Student vacancy related requests', () => {
    const newCompany = {
        credentials: {
            method: 'local',
            email: faker.internet.email().toLowerCase(),
            password: faker.internet.password()
        },
        name: faker.company.companyName(),
    };
    const newStudent = {
        credentials: {
            method: 'local',
            email: faker.internet.email().toLowerCase(),
            password: faker.internet.password()
        },
    }
    var companyToken;
    var studentToken;
    var companyId;
    var studentId;
    var vacancyId;

    const newVacancy = {
        vacancyField: "IT",
        vacancyName: "SWE",
        description: faker.name.jobDescriptor(),
        demands: [faker.lorem.words()],
        type: ["full-time"],
        minSalary: 50000,
        maxSalary: 100000,
    }

    before((done) => {
        mongoose.connect(config.DBHost);
        mongoose.connection.dropDatabase(() => {
            var company = new Company(newCompany);
            company.save(function(err, savedCompany) {
                companyToken = JWT.sign({
                        iss: 'john',
                        sub: {
                            id: savedCompany.id,
                        },
                        iat: Date.now(),
                        exp: new Date().setDate(new Date().getDate() + 1)
                    }, JWT_SECRET);
                companyId = savedCompany.id;
                var student = new Student(newStudent);
                student.save(function(err, savedStudent) {
                    studentToken = JWT.sign({
                            iss: 'john',
                            sub: {
                                id: savedStudent.id,
                            },
                            iat: Date.now(),
                            exp: new Date().setDate(new Date().getDate() + 1)
                        }, JWT_SECRET);
                    studentId = savedStudent.id;
                    chai.request(server)
                        .post('/company/vacancy')
                        .set('Authorization', companyToken)
                        .send(newVacancy)
                        .end((err, res) => {
                            expect(err).to.be.null;
                            res.should.have.status(200);
                            Vacancy.findOne({'companyId': companyId}, (err, vacancy) => {
                                expect(err).to.be.null;
                                vacancyId = vacancy.id;
                                done();
                            });
                        });
                });
            });
        });
    });

    describe('/POST /student/vacancy/apply', () => {
        it('it should apply to company', (done) => {
            chai.request(server)
                .post('/student/vacancy/apply')
                .set('Authorization', studentToken)
                .send({'vacancyId': vacancyId})
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.an('object');
                    res.body.should.have.property('status');
                    expect(res.body.status).to.be.eql('ok');
                    Vacancy.findOne({'companyId': companyId}, function(err, vacancy) {
                        expect(err).to.be.null;
                        expect(vacancy.studentApplied[0]).to.have.property('studentId');
                        expect(vacancy.studentApplied[0]).to.have.property('status');
                        expect(vacancy.studentApplied[0].studentId).to.be.eql(studentId);
                        expect(vacancy.studentApplied[0].status).to.be.eql('pending');
                        Student.findById(studentId, function(err, student) {
                            expect(err).to.be.null;
                            expect(student).not.to.be.null;
                            expect(student.vacancies.indexOf(vacancyId) > -1);
                            done();
                        });
                    });
                })
        });

        it('it shouldn\'t apply to company with wrong input', (done) => {
            chai.request(server)
                .post('/student/vacancy/apply')
                .set('Authorization', studentToken)
                .send({'vacancyId': vacancyId, 'asd': '1'})
                .end((err, res) => {
                    res.should.have.status(400);
                    res.body.should.be.an('object');
                    res.body.should.have.property('name');
                    expect(res.body.name).to.be.eql('ValidationError');
                    done();
                })
        });

        it('it shouldn\'t apply to company without vacancyId', (done) => {
            chai.request(server)
                .post('/student/vacancy/apply')
                .set('Authorization', studentToken)
                .send({})
                .end((err, res) => {
                    res.should.have.status(400);
                    res.body.should.be.an('object');
                    res.body.should.have.property('name');
                    expect(res.body.name).to.be.eql('ValidationError');
                    done();
                })
        });

        it('it shouldn\'t apply to student without credentials', (done) => {
            chai.request(server)
                .post('/student/vacancy/apply')
                .send({'vacancyId': vacancyId})
                .end((err, res) => {
                    res.should.have.status(401);
                    res.should.have.property('text');
                    res.text.should.be.eql('Unauthorized');
                    done();
                })
        });
    });

    describe('/POST /student/vacancy/accept', () => {
        const newCompany = {
            credentials: {
                method: 'local',
                email: faker.internet.email().toLowerCase(),
                password: faker.internet.password()
            },
            name: faker.company.companyName(),
        }
        var newCompanyId;
        var newCompanyToken;
        var newVacancyId;
        before((done) => {
            var company = new Company(newCompany);
            company.save(function(err, savedCompany) {
                newCompanyToken = JWT.sign({
                        iss: 'john',
                        sub: {
                            id: savedCompany.id,
                        },
                        iat: Date.now(),
                        exp: new Date().setDate(new Date().getDate() + 1)
                    }, JWT_SECRET);
                newCompanyId = savedCompany.id;
                chai.request(server)
                    .post('/company/vacancy')
                    .set('Authorization', newCompanyToken)
                    .send({'vacancyField': 'medicine', 'vacancyName': 'doctor'})
                    .end((err, res) => {
                        Vacancy.findOne({'companyId': newCompanyId}, (err, vacancy) => {
                            expect(err).to.be.null;
                            newVacancyId = vacancy.id;
                            chai.request(server)
                                .post('/company/vacancy/apply')
                                .set('Authorization', newCompanyToken)
                                .send({'vacancyId': newVacancyId, 'studentId': studentId})
                                .end((err, res) => {
                                    expect(err).to.be.null;
                                    res.should.have.status(200);
                                    done();
                                })
                        })
                    });
            });
        });

        it('it should accept company\'s application', (done) => {
            chai.request(server)
                .post('/student/vacancy/accept')
                .set('Authorization', studentToken)
                .send({'vacancyId': newVacancyId})
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.an('object');
                    res.body.should.have.property('status');
                    expect(res.body.status).to.be.eql('ok');
                    Vacancy.findById(newVacancyId, function(err, vacancy) {
                        expect(err).to.be.null;
                        expect(vacancy.companyApplied[0]).to.have.property('studentId');
                        expect(vacancy.companyApplied[0]).to.have.property('status');
                        expect(vacancy.companyApplied[0].studentId).to.be.eql(studentId);
                        expect(vacancy.companyApplied[0].status).to.be.eql('accepted');
                        done();
                    });
                })
        });

        it('it shouldn\'t accept student\'s application with wrong input', (done) => {
            chai.request(server)
                .post('/student/vacancy/accept')
                .set('Authorization', studentToken)
                .send({'vacancyId': newVacancyId, 'asd': '1'})
                .end((err, res) => {
                    res.should.have.status(400);
                    res.body.should.be.an('object');
                    res.body.should.have.property('name');
                    expect(res.body.name).to.be.eql('ValidationError');
                    done();
                })
        });

        it('it shouldn\'t accept company\'s application without vacancyId', (done) => {
            chai.request(server)
                .post('/student/vacancy/accept')
                .set('Authorization', studentToken)
                .send({})
                .end((err, res) => {
                    res.should.have.status(400);
                    res.body.should.be.an('object');
                    res.body.should.have.property('name');
                    expect(res.body.name).to.be.eql('ValidationError');
                    done();
                })
        });

        it('it shouldn\'t accept company\'s application without credentials', (done) => {
            chai.request(server)
                .post('/student/vacancy/accept')
                .send({'vacancyId': newVacancyId})
                .end((err, res) => {
                    res.should.have.status(401);
                    res.should.have.property('text');
                    res.text.should.be.eql('Unauthorized');
                    done();
                })
        });

        it('it shouldn\'t accept application which student sent', (done) => {
            chai.request(server)
                .post('/student/vacancy/accept')
                .set({'Authorization': studentToken})
                .send({'vacancyId': vacancyId})
                .end((err, res) => {
                    res.should.have.status(409);
                    res.body.should.have.property('error');
                    res.body.error.should.be.eql("student wasn't called");
                    done();
                })
        })
    });

    describe('/POST /student/vacancy/reject', () => {
        const newCompany = {
            credentials: {
                method: 'local',
                email: faker.internet.email().toLowerCase(),
                password: faker.internet.password()
            },
            name: faker.company.companyName(),
        }
        var newCompanyId;
        var newCompanyToken;
        var newVacancyId;
        before((done) => {
            var company = new Company(newCompany);
            company.save(function(err, savedCompany) {
                newCompanyToken = JWT.sign({
                        iss: 'john',
                        sub: {
                            id: savedCompany.id,
                        },
                        iat: Date.now(),
                        exp: new Date().setDate(new Date().getDate() + 1)
                    }, JWT_SECRET);
                newCompanyId = savedCompany.id;
                chai.request(server)
                    .post('/company/vacancy')
                    .set('Authorization', newCompanyToken)
                    .send({'vacancyField': 'medicine', 'vacancyName': 'doctor'})
                    .end((err, res) => {
                        Vacancy.findOne({'companyId': newCompanyId}, (err, vacancy) => {
                            expect(err).to.be.null;
                            newVacancyId = vacancy.id;
                            chai.request(server)
                                .post('/company/vacancy/apply')
                                .set('Authorization', newCompanyToken)
                                .send({'vacancyId': newVacancyId, 'studentId': studentId})
                                .end((err, res) => {
                                    expect(err).to.be.null;
                                    res.should.have.status(200);
                                    done();
                                })
                        })
                    });
            });
        });

        it('it should reject company\'s application', (done) => {
            chai.request(server)
                .post('/student/vacancy/reject')
                .set('Authorization', studentToken)
                .send({'vacancyId': newVacancyId})
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.an('object');
                    res.body.should.have.property('status');
                    expect(res.body.status).to.be.eql('ok');
                    Vacancy.findById(newVacancyId, function(err, vacancy) {
                        expect(err).to.be.null;
                        expect(vacancy.companyApplied[0]).to.have.property('studentId');
                        expect(vacancy.companyApplied[0]).to.have.property('status');
                        expect(vacancy.companyApplied[0].studentId).to.be.eql(studentId);
                        expect(vacancy.companyApplied[0].status).to.be.eql('rejected');
                        done();
                    });
                })
        });

        it('it shouldn\'t reject company\'s application with wrong input', (done) => {
            chai.request(server)
                .post('/student/vacancy/reject')
                .set('Authorization', studentToken)
                .send({'vacancyId': newVacancyId, 'asd': '1'})
                .end((err, res) => {
                    res.should.have.status(400);
                    res.body.should.be.an('object');
                    res.body.should.have.property('name');
                    expect(res.body.name).to.be.eql('ValidationError');
                    done();
                })
        });

        it('it shouldn\'t reject company\'s application without vacancyId', (done) => {
            chai.request(server)
                .post('/student/vacancy/reject')
                .set('Authorization', studentToken)
                .send({})
                .end((err, res) => {
                    res.should.have.status(400);
                    res.body.should.be.an('object');
                    res.body.should.have.property('name');
                    expect(res.body.name).to.be.eql('ValidationError');
                    done();
                })
        });

        it('it shouldn\'t reject company\'s application without credentials', (done) => {
            chai.request(server)
                .post('/student/vacancy/reject')
                .send({'vacancyId': newVacancyId})
                .end((err, res) => {
                    res.should.have.status(401);
                    res.should.have.property('text');
                    res.text.should.be.eql('Unauthorized');
                    done();
                })
        });

        it('it shouldn\'t reject application which student sent', (done) => {
            chai.request(server)
                .post('/student/vacancy/reject')
                .set({'Authorization': studentToken})
                .send({'vacancyId': vacancyId})
                .end((err, res) => {
                    res.should.have.status(409);
                    res.body.should.have.property('error');
                    res.body.error.should.be.eql("student wasn't called");
                    done();
                })
        });

        describe('/POST /student/vacancy/discard', () => {
            it('it should discard company\'s application', (done) => {
                chai.request(server)
                    .post('/student/vacancy/discard')
                    .set('Authorization', studentToken)
                    .send({'vacancyId': newVacancyId})
                    .end((err, res) => {
                        res.should.have.status(200);
                        res.body.should.be.an('object');
                        res.body.should.have.property('status');
                        expect(res.body.status).to.be.eql('ok');
                        Vacancy.findById(newVacancyId, function(err, vacancy) {
                            expect(err).to.be.null;
                            expect(vacancy.companyApplied[0]).to.have.property('studentId');
                            expect(vacancy.companyApplied[0]).to.have.property('status');
                            expect(vacancy.companyApplied[0].studentId).to.be.eql(studentId);
                            expect(vacancy.companyApplied[0].status).to.be.eql('discarded');
                            done();
                        });
                    })
            });

            describe('Discarding wrong applications', () => {
                const newCompany = {
                    credentials: {
                        method: 'local',
                        email: faker.internet.email().toLowerCase(),
                        password: faker.internet.password()
                    },
                    name: faker.company.companyName(),
                }
                var newCompanyId;
                var newCompanyToken;
                var newVacancyId;
                before((done) => {
                    var company = new Company(newCompany);
                    company.save(function(err, savedCompany) {
                        newCompanyToken = JWT.sign({
                                iss: 'john',
                                sub: {
                                    id: savedCompany.id,
                                },
                                iat: Date.now(),
                                exp: new Date().setDate(new Date().getDate() + 1)
                            }, JWT_SECRET);
                        newCompanyId = savedCompany.id;
                        chai.request(server)
                            .post('/company/vacancy')
                            .set('Authorization', newCompanyToken)
                            .send({'vacancyField': 'medicine', 'vacancyName': 'doctor'})
                            .end((err, res) => {
                                Vacancy.findOne({'companyId': newCompanyId}, (err, vacancy) => {
                                    expect(err).to.be.null;
                                    newVacancyId = vacancy.id;
                                    chai.request(server)
                                        .post('/company/vacancy/apply')
                                        .set('Authorization', newCompanyToken)
                                        .send({'vacancyId': newVacancyId, 'studentId': studentId})
                                        .end((err, res) => {
                                            expect(err).to.be.null;
                                            res.should.have.status(200);
                                            done();
                                        })
                                })
                            });
                    });
                });

                it('it shouldn\'t discard pending application', (done) => {
                    chai.request(server)
                        .post('/student/vacancy/discard')
                        .set('Authorization', studentToken)
                        .send({'vacancyId': newVacancyId})
                        .end((err, res) => {
                            res.should.have.status(400);
                            res.body.should.be.an('object');
                            res.body.should.have.property('error');
                            expect(res.body.error).to.be.eql('can be discarded only after rejection');
                            done();
                        })
                });

                it('it shouldn\'t discard accepted application', (done) => {
                    chai.request(server)
                        .post('/student/vacancy/accept')
                        .set('Authorization', studentToken)
                        .send({'vacancyId': newVacancyId})
                        .end((err, res) => {
                            expect(err).to.be.null;
                            res.should.have.status(200);
                            chai.request(server)
                                .post('/student/vacancy/discard')
                                .set('Authorization', studentToken)
                                .send({'vacancyId': newVacancyId})
                                .end((err, res) => {
                                    res.should.have.status(400);
                                    res.body.should.be.an('object');
                                    res.body.should.have.property('error');
                                    expect(res.body.error).to.be.eql('can be discarded only after rejection');
                                    done();
                                });
                        });
                });
            });

            it('it shouldn\'t discard company\'s application with wrong input', (done) => {
                chai.request(server)
                    .post('/student/vacancy/discard')
                    .set('Authorization', studentToken)
                    .send({'vacancyId': newVacancyId, 'asd': '1'})
                    .end((err, res) => {
                        res.should.have.status(400);
                        res.body.should.be.an('object');
                        res.body.should.have.property('name');
                        expect(res.body.name).to.be.eql('ValidationError');
                        done();
                    })
            });

            it('it shouldn\'t discard company\'s application without vacancyId', (done) => {
                chai.request(server)
                    .post('/student/vacancy/discard')
                    .set('Authorization', studentToken)
                    .send({})
                    .end((err, res) => {
                        res.should.have.status(400);
                        res.body.should.be.an('object');
                        res.body.should.have.property('name');
                        expect(res.body.name).to.be.eql('ValidationError');
                        done();
                    })
            });

            it('it shouldn\'t discard company\'s application without credentials', (done) => {
                chai.request(server)
                    .post('/student/vacancy/discard')
                    .send({'vacancyId': newVacancyId})
                    .end((err, res) => {
                        res.should.have.status(401);
                        res.should.have.property('text');
                        res.text.should.be.eql('Unauthorized');
                        done();
                    })
            });

            it('it shouldn\'t discard application which student sent', (done) => {
                chai.request(server)
                    .post('/student/vacancy/discard')
                    .set({'Authorization': studentToken})
                    .send({'vacancyId': vacancyId})
                    .end((err, res) => {
                        res.should.have.status(409);
                        res.body.should.have.property('error');
                        res.body.error.should.be.eql("student wasn't called");
                        done();
                    })
            })
        })
    })

    after((done) => {
        mongoose.connection.dropDatabase(() => {
            mongoose.disconnect();
            done();
        });
    });
});
