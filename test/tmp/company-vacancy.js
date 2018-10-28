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

describe('Company vacancy related requests', () => {
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
                    done();
                });
            });
        });
    });

    describe('/POST /company/vacancy/', () => {
        it('it should create new vacancy', (done) => {
            chai.request(server)
                .post('/company/vacancy')
                .set('Authorization', companyToken)
                .send(newVacancy)
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.an('object');
                    res.body.should.have.property('status');
                    expect(res.body.status).to.be.eql('ok');
                    Vacancy.findOne({'companyId': companyId}, function(err, vacancy) {
                        expect(err).to.be.null;
                        expect(vacancy.description).to.be.eql(newVacancy.description);
                        expect(vacancy.demands).to.be.eql(newVacancy.demands);
                        expect(vacancy.type).to.be.eql(newVacancy.type);
                        expect(vacancy.minSalary).to.be.eql(newVacancy.minSalary);
                        expect(vacancy.maxSalary).to.be.eql(newVacancy.maxSalary);
                        expect(vacancy.vacancyName).to.be.eql(newVacancy.vacancyName);
                        expect(vacancy.companyId).to.be.eql(companyId);
                        expect(vacancy.companyName).to.be.eql(newCompany.name);
                        expect(vacancy.companyApplied).to.be.eql([]);
                        expect(vacancy.studentApplied).to.be.eql([]);
                        vacancyId = vacancy.id;
                        Company.findById(companyId, function(err, company) {
                            expect(err).to.be.null;
                            expect(company).not.to.be.null;
                            expect(company.vacancies.indexOf(vacancyId) > -1);
                            done();
                        });
                    });
                })
        });

        it('it shouldn\'t create new vacancy without vacancyName', (done) => {
            chai.request(server)
                .post('/company/vacancy')
                .set('Authorization', companyToken)
                .send({'description': newVacancy.description})
                .end((err, res) => {
                    res.should.have.status(400);
                    res.body.should.be.an('object');
                    res.body.should.have.property('name');
                    expect(res.body.name).to.be.eql('ValidationError');
                    done();
                })
        });

        it('it shouldn\'t create new vacancy with wrong input', (done) => {
            chai.request(server)
                .post('/company/vacancy')
                .set('Authorization', companyToken)
                .send({'vacancyName': newVacancy.vacancyName, 'asd': '1'})
                .end((err, res) => {
                    res.should.have.status(400);
                    res.body.should.be.an('object');
                    res.body.should.have.property('name');
                    expect(res.body.name).to.be.eql('ValidationError');
                    done();
                })
        });

        it('it shouldn\'t create new vacancy without credentials', (done) => {
            chai.request(server)
                .post('/company/vacancy')
                .send(newVacancy)
                .end((err, res) => {
                    res.should.have.status(401);
                    res.should.have.property('text');
                    res.text.should.be.eql('Unauthorized');
                    done();
                })
        });
    });

    describe('/POST /company/vacancy/apply', () => {
        it('it should apply to student', (done) => {
            chai.request(server)
                .post('/company/vacancy/apply')
                .set('Authorization', companyToken)
                .send({'vacancyId': vacancyId, 'studentId': studentId})
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.an('object');
                    res.body.should.have.property('status');
                    expect(res.body.status).to.be.eql('ok');
                    Vacancy.findOne({'companyId': companyId}, function(err, vacancy) {
                        expect(err).to.be.null;
                        expect(vacancy.companyApplied[0]).to.have.property('studentId');
                        expect(vacancy.companyApplied[0]).to.have.property('status');
                        expect(vacancy.companyApplied[0].studentId).to.be.eql(studentId);
                        expect(vacancy.companyApplied[0].status).to.be.eql('pending');
                        Student.findById(studentId, function(err, student) {
                            expect(err).to.be.null;
                            expect(student).not.to.be.null;
                            expect(student.vacancies.indexOf(vacancyId) > -1);
                            done();
                        });
                    });
                })
        });

        it('it shouldn\'t apply to student with wrong input', (done) => {
            chai.request(server)
                .post('/company/vacancy/apply')
                .set('Authorization', companyToken)
                .send({'vacancyId': vacancyId, 'studentId': studentId, 'asd': '1'})
                .end((err, res) => {
                    res.should.have.status(400);
                    res.body.should.be.an('object');
                    res.body.should.have.property('name');
                    expect(res.body.name).to.be.eql('ValidationError');
                    done();
                })
        });

        it('it shouldn\'t apply to student without vacancyId', (done) => {
            chai.request(server)
                .post('/company/vacancy/apply')
                .set('Authorization', companyToken)
                .send({'studentId': studentId})
                .end((err, res) => {
                    res.should.have.status(400);
                    res.body.should.be.an('object');
                    res.body.should.have.property('name');
                    expect(res.body.name).to.be.eql('ValidationError');
                    done();
                })
        });

        it('it shouldn\'t apply to student without studentId', (done) => {
            chai.request(server)
                .post('/company/vacancy/apply')
                .set('Authorization', companyToken)
                .send({'vacancyId': vacancyId})
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
                .post('/company/vacancy/apply')
                .send({'vacancyId': vacancyId, 'studentId': studentId})
                .end((err, res) => {
                    res.should.have.status(401);
                    res.should.have.property('text');
                    res.text.should.be.eql('Unauthorized');
                    done();
                })
        });
    });

    describe('/POST /company/vacancy/accept', () => {
        const newStudent = {
            credentials: {
                method: 'local',
                email: faker.internet.email().toLowerCase(),
                password: faker.internet.password()
            },
        }
        var newStudentId;
        var newStudentToken;
        before((done) => {
            var student = new Student(newStudent);
            student.save(function(err, savedStudent) {
                newStudentToken = JWT.sign({
                        iss: 'john',
                        sub: {
                            id: savedStudent.id,
                        },
                        iat: Date.now(),
                        exp: new Date().setDate(new Date().getDate() + 1)
                    }, JWT_SECRET);
                newStudentId = savedStudent.id;
                chai.request(server)
                    .post('/student/vacancy/apply')
                    .set('Authorization', newStudentToken)
                    .send({'vacancyId': vacancyId})
                    .end((err, res) => {
                        expect(err).to.be.null;
                        res.should.have.status(200);
                        done();
                    })
            });
        });

        it('it should accept student\'s application', (done) => {
            chai.request(server)
                .post('/company/vacancy/accept')
                .set('Authorization', companyToken)
                .send({'vacancyId': vacancyId, 'studentId': newStudentId})
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.an('object');
                    res.body.should.have.property('status');
                    expect(res.body.status).to.be.eql('ok');
                    Vacancy.findOne({'companyId': companyId}, function(err, vacancy) {
                        expect(err).to.be.null;
                        expect(vacancy.studentApplied[0]).to.have.property('studentId');
                        expect(vacancy.studentApplied[0]).to.have.property('status');
                        expect(vacancy.studentApplied[0].studentId).to.be.eql(newStudentId);
                        expect(vacancy.studentApplied[0].status).to.be.eql('accepted');
                        done();
                    });
                })
        });

        it('it shouldn\'t accept student\'s application with wrong input', (done) => {
            chai.request(server)
                .post('/company/vacancy/accept')
                .set('Authorization', companyToken)
                .send({'vacancyId': vacancyId, 'studentId': newStudentId, 'asd': '1'})
                .end((err, res) => {
                    res.should.have.status(400);
                    res.body.should.be.an('object');
                    res.body.should.have.property('name');
                    expect(res.body.name).to.be.eql('ValidationError');
                    done();
                })
        });

        it('it shouldn\'t accept student\'s application without vacancyId', (done) => {
            chai.request(server)
                .post('/company/vacancy/accept')
                .set('Authorization', companyToken)
                .send({'studentId': newStudentId})
                .end((err, res) => {
                    res.should.have.status(400);
                    res.body.should.be.an('object');
                    res.body.should.have.property('name');
                    expect(res.body.name).to.be.eql('ValidationError');
                    done();
                })
        });

        it('it shouldn\'t accept student\'s application without studentId', (done) => {
            chai.request(server)
                .post('/company/vacancy/accept')
                .set('Authorization', companyToken)
                .send({'vacancyId': vacancyId})
                .end((err, res) => {
                    res.should.have.status(400);
                    res.body.should.be.an('object');
                    res.body.should.have.property('name');
                    expect(res.body.name).to.be.eql('ValidationError');
                    done();
                })
        });

        it('it shouldn\'t accept student\'s application without credentials', (done) => {
            chai.request(server)
                .post('/company/vacancy/accept')
                .send({'vacancyId': vacancyId, 'studentId': newStudentId})
                .end((err, res) => {
                    res.should.have.status(401);
                    res.should.have.property('text');
                    res.text.should.be.eql('Unauthorized');
                    done();
                })
        });

        it('it shouldn\'t accept application which company sent', (done) => {
            chai.request(server)
                .post('/company/vacancy/accept')
                .set({'Authorization': companyToken})
                .send({'vacancyId': vacancyId, 'studentId': studentId})
                .end((err, res) => {
                    res.should.have.status(409);
                    res.body.should.have.property('error');
                    res.body.error.should.be.eql("company wasn't called");
                    done();
                })
        })
    });

    describe('/POST /company/vacancy/reject', () => {
        const newStudent = {
            credentials: {
                method: 'local',
                email: faker.internet.email().toLowerCase(),
                password: faker.internet.password()
            },
        };
        var newStudentId;
        var newStudentToken;
        before((done) => {
            var student = new Student(newStudent);
            student.save(function(err, savedStudent) {
                newStudentToken = JWT.sign({
                        iss: 'john',
                        sub: {
                            id: savedStudent.id,
                        },
                        iat: Date.now(),
                        exp: new Date().setDate(new Date().getDate() + 1)
                    }, JWT_SECRET);
                newStudentId = savedStudent.id;
                chai.request(server)
                    .post('/student/vacancy/apply')
                    .set('Authorization', newStudentToken)
                    .send({'vacancyId': vacancyId})
                    .end((err, res) => {
                        expect(err).to.be.null;
                        res.should.have.status(200);
                        done();
                    })
            });
        });

        it('it should reject student\'s application', (done) => {
            chai.request(server)
                .post('/company/vacancy/reject')
                .set('Authorization', companyToken)
                .send({'vacancyId': vacancyId, 'studentId': newStudentId})
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.an('object');
                    res.body.should.have.property('status');
                    expect(res.body.status).to.be.eql('ok');
                    Vacancy.findOne({'companyId': companyId}, function(err, vacancy) {
                        expect(err).to.be.null;
                        expect(vacancy.studentApplied[1]).to.have.property('studentId');
                        expect(vacancy.studentApplied[1]).to.have.property('status');
                        expect(vacancy.studentApplied[1].studentId).to.be.eql(newStudentId);
                        expect(vacancy.studentApplied[1].status).to.be.eql('rejected');
                        done();
                    });
                })
        });

        it('it shouldn\'t reject student\'s application with wrong input', (done) => {
            chai.request(server)
                .post('/company/vacancy/reject')
                .set('Authorization', companyToken)
                .send({'vacancyId': vacancyId, 'studentId': newStudentId, 'asd': '1'})
                .end((err, res) => {
                    res.should.have.status(400);
                    res.body.should.be.an('object');
                    res.body.should.have.property('name');
                    expect(res.body.name).to.be.eql('ValidationError');
                    done();
                })
        });

        it('it shouldn\'t reject student\'s application without vacancyId', (done) => {
            chai.request(server)
                .post('/company/vacancy/reject')
                .set('Authorization', companyToken)
                .send({'studentId': newStudentId})
                .end((err, res) => {
                    res.should.have.status(400);
                    res.body.should.be.an('object');
                    res.body.should.have.property('name');
                    expect(res.body.name).to.be.eql('ValidationError');
                    done();
                })
        });

        it('it shouldn\'t reject student\'s application without studentId', (done) => {
            chai.request(server)
                .post('/company/vacancy/reject')
                .set('Authorization', companyToken)
                .send({'vacancyId': vacancyId})
                .end((err, res) => {
                    res.should.have.status(400);
                    res.body.should.be.an('object');
                    res.body.should.have.property('name');
                    expect(res.body.name).to.be.eql('ValidationError');
                    done();
                })
        });

        it('it shouldn\'t reject student\'s application without credentials', (done) => {
            chai.request(server)
                .post('/company/vacancy/reject')
                .send({'vacancyId': vacancyId, 'studentId': newStudentId})
                .end((err, res) => {
                    res.should.have.status(401);
                    res.should.have.property('text');
                    res.text.should.be.eql('Unauthorized');
                    done();
                })
        });

        it('it shouldn\'t reject application which company sent', (done) => {
            chai.request(server)
                .post('/company/vacancy/reject')
                .set({'Authorization': companyToken})
                .send({'vacancyId': vacancyId, 'studentId': studentId})
                .end((err, res) => {
                    res.should.have.status(409);
                    res.body.should.have.property('error');
                    res.body.error.should.be.eql("company wasn't called");
                    done();
                })
        });

        describe('/POST /company/vacancy/discard', () => {
            it('it should discard student\'s application', (done) => {
                chai.request(server)
                    .post('/company/vacancy/discard')
                    .set('Authorization', companyToken)
                    .send({'vacancyId': vacancyId, 'studentId': newStudentId})
                    .end((err, res) => {
                        res.should.have.status(200);
                        res.body.should.be.an('object');
                        res.body.should.have.property('status');
                        expect(res.body.status).to.be.eql('ok');
                        Vacancy.findOne({'companyId': companyId}, function(err, vacancy) {
                            expect(err).to.be.null;
                            expect(vacancy.studentApplied[1]).to.have.property('studentId');
                            expect(vacancy.studentApplied[1]).to.have.property('status');
                            expect(vacancy.studentApplied[1].studentId).to.be.eql(newStudentId);
                            expect(vacancy.studentApplied[1].status).to.be.eql('discarded');
                            done();
                        });
                    })
            });

            describe('Discarding wrong applications', () => {
                const newStudent = {
                    credentials: {
                        method: 'local',
                        email: faker.internet.email().toLowerCase(),
                        password: faker.internet.password()
                    },
                };
                var pendingStudentId;
                var pendingStudentToken;
                before((done) => {
                    var student = new Student(newStudent);
                    student.save(function(err, savedStudent) {
                        pendingStudentToken = JWT.sign({
                                iss: 'john',
                                sub: {
                                    id: savedStudent.id,
                                },
                                iat: Date.now(),
                                exp: new Date().setDate(new Date().getDate() + 1)
                            }, JWT_SECRET);
                        pendingStudentId = savedStudent.id;
                        chai.request(server)
                            .post('/student/vacancy/apply')
                            .set('Authorization', pendingStudentToken)
                            .send({'vacancyId': vacancyId})
                            .end((err, res) => {
                                expect(err).to.be.null;
                                res.should.have.status(200);
                                done();
                            })
                    });
                });

                it('it shouldn\'t discard pending application', (done) => {
                    chai.request(server)
                        .post('/company/vacancy/discard')
                        .set('Authorization', companyToken)
                        .send({'vacancyId': vacancyId, 'studentId': pendingStudentId})
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
                        .post('/company/vacancy/accept')
                        .set('Authorization', companyToken)
                        .send({'vacancyId': vacancyId, 'studentId': pendingStudentId})
                        .end((err, res) => {
                            expect(err).to.be.null;
                            res.should.have.status(200);
                            chai.request(server)
                                .post('/company/vacancy/discard')
                                .set('Authorization', companyToken)
                                .send({'vacancyId': vacancyId, 'studentId': pendingStudentId})
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

            it('it shouldn\'t discard student\'s application with wrong input', (done) => {
                chai.request(server)
                    .post('/company/vacancy/discard')
                    .set('Authorization', companyToken)
                    .send({'vacancyId': vacancyId, 'studentId': newStudentId, 'asd': '1'})
                    .end((err, res) => {
                        res.should.have.status(400);
                        res.body.should.be.an('object');
                        res.body.should.have.property('name');
                        expect(res.body.name).to.be.eql('ValidationError');
                        done();
                    })
            });

            it('it shouldn\'t discard student\'s application without vacancyId', (done) => {
                chai.request(server)
                    .post('/company/vacancy/discard')
                    .set('Authorization', companyToken)
                    .send({'studentId': newStudentId})
                    .end((err, res) => {
                        res.should.have.status(400);
                        res.body.should.be.an('object');
                        res.body.should.have.property('name');
                        expect(res.body.name).to.be.eql('ValidationError');
                        done();
                    })
            });

            it('it shouldn\'t discard student\'s application without studentId', (done) => {
                chai.request(server)
                    .post('/company/vacancy/discard')
                    .set('Authorization', companyToken)
                    .send({'vacancyId': vacancyId})
                    .end((err, res) => {
                        res.should.have.status(400);
                        res.body.should.be.an('object');
                        res.body.should.have.property('name');
                        expect(res.body.name).to.be.eql('ValidationError');
                        done();
                    })
            });

            it('it shouldn\'t discard student\'s application without credentials', (done) => {
                chai.request(server)
                    .post('/company/vacancy/discard')
                    .send({'vacancyId': vacancyId, 'studentId': newStudentId})
                    .end((err, res) => {
                        res.should.have.status(401);
                        res.should.have.property('text');
                        res.text.should.be.eql('Unauthorized');
                        done();
                    })
            });

            it('it shouldn\'t discard application which company sent', (done) => {
                chai.request(server)
                    .post('/company/vacancy/discard')
                    .set({'Authorization': companyToken})
                    .send({'vacancyId': vacancyId, 'studentId': studentId})
                    .end((err, res) => {
                        res.should.have.status(409);
                        res.body.should.have.property('error');
                        res.body.error.should.be.eql("company wasn't called");
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
