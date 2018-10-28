//During the test the env variable is set to test
require('module-alias/register');

const mongoose = require("mongoose");
const Student = require('@models/student');
const JWT = require('jsonwebtoken');
const { JWT_SECRET } = require('@configuration');
const { signToken } = require('@controllers/helpers');

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

describe('General vacancy requests', () => {
    var students = [{
            credentials: {
                method: 'local',
                email: 'a@gmail.com',
                password: faker.internet.password()
            },
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName(),
            phone: faker.phone.phoneNumber(),
            description: faker.lorem.sentences()
        },{
            credentials: {
                method: 'local',
                email: 'b@gmail.com',
                password: faker.internet.password()
            },
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName(),
            phone: faker.phone.phoneNumber(),
            description: faker.lorem.sentences()
        },{
            credentials: {
                method: 'local',
                email: 'c@gmail.com',
                password: faker.internet.password()
            },
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName(),
            phone: faker.phone.phoneNumber(),
            description: faker.lorem.sentences()
        },{
            credentials: {
                method: 'local',
                email: 'd@gmail.com',
                password: faker.internet.password()
            },
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName(),
            phone: faker.phone.phoneNumber(),
            description: faker.lorem.sentences()
        }];
    var studentids = [];
    before((done) => {
        mongoose.connect(config.DBHost);
        mongoose.connection.dropDatabase(() => {
            new Student(students[0]).save((err, student) => {
                expect(err).to.be.null;
                studentids[0] = student.id;
                new Student(students[1]).save((err, student) => {
                    expect(err).to.be.null;
                    studentids[1] = student.id;
                    new Student(students[2]).save((err, student) => {
                        expect(err).to.be.null;
                        studentids[2] = student.id;
                        new Student(students[3]).save((err, student) => {
                            expect(err).to.be.null;
                            studentids[3] = student.id;
                            done();
                        });
                    });
                });
            });
        });
    });

    describe('/POST /student/ids/:page/:limit', () => {
        it('it should get 2 elements with max of 2', (done) => {
            chai.request(server)
                .post('/student/ids/0/2')
                .end((err, res) => {
                    expect(err).to.be.null;
                    expect(res.body).to.be.an('array');
                    expect(res.body.length).to.be.eql(2);
                    expect(res.body[0]).to.be.eql(studentids[3]);
                    expect(res.body[1]).to.be.eql(studentids[2]);
                    done();
                });
        });

        it('it should get 4 elements with max of 10', (done) => {
            chai.request(server)
                .post('/student/ids/0/10')
                .end((err, res) => {
                    expect(err).to.be.null;
                    expect(res.body).to.be.an('array');
                    expect(res.body.length).to.be.eql(4);
                    expect(res.body[0]).to.be.eql(studentids[3]);
                    expect(res.body[1]).to.be.eql(studentids[2]);
                    expect(res.body[2]).to.be.eql(studentids[1]);
                    expect(res.body[3]).to.be.eql(studentids[0]);
                    done();
                });
        });

        it('it should get 0 elements', (done) => {
            chai.request(server)
                .post('/student/ids/1/10')
                .end((err, res) => {
                    expect(err).to.be.null;
                    expect(res.body).to.be.an('array');
                    expect(res.body.length).to.be.eql(0);
                    done();
                });
        });

        it('it should get 1 element with max of 3', (done) => {
            chai.request(server)
                .post('/student/ids/1/3')
                .end((err, res) => {
                    expect(err).to.be.null;
                    expect(res.body).to.be.an('array');
                    expect(res.body.length).to.be.eql(1);
                    expect(res.body[0]).to.be.eql(studentids[0]);
                    done();
                });
        });
    });

    describe('/POST /student/:page/:limit', () => {
        it('it should require {credentials.email, firstName, lastName}', (done) => {
            chai.request(server)
                .post('/student/0/2')
                .send({
                    'requirements': {
                        'credentials.email': 1,
                        'firstName': 1,
                        'lastName': 1,
                    },
                })
                .end((err, res) => {
                    expect(err).to.be.null;
                    expect(res.body).to.be.an('array');
                    expect(res.body.length).to.be.eql(2);
                    expect(res.body[0]).to.be.an('object');
                    expect(res.body[0]).to.have.all.keys(
                        '_id', 'credentials', 'firstName', 'lastName'
                    );
                    expect(res.body[0].credentials).to.have.key('email');
                    expect(res.body[0]).to.not.have.all.keys(
                        'phone', 'description'
                    )
                    expect(res.body[0].credentials).to.not.have.key('password');
                    expect(res.body[1]).to.be.an('object');
                    expect(res.body[1]).to.have.all.keys(
                        '_id', 'credentials', 'firstName', 'lastName'
                    );
                    expect(res.body[1].credentials).to.have.key('email');
                    expect(res.body[1]).to.not.have.all.keys(
                        'phone', 'description'
                    )
                    expect(res.body[1].credentials).to.not.have.key('password');
                    expect(res.body[0]._id).to.be.eql(studentids[3]);
                    expect(res.body[0].credentials.email).to.be.eql(students[3].credentials.email);
                    expect(res.body[0].firstName).to.be.eql(students[3].firstName);
                    expect(res.body[0].lastName).to.be.eql(students[3].lastName);
                    expect(res.body[1]._id).to.be.eql(studentids[2]);
                    expect(res.body[1].credentials.email).to.be.eql(students[2].credentials.email);
                    expect(res.body[1].firstName).to.be.eql(students[2].firstName);
                    expect(res.body[1].lastName).to.be.eql(students[2].lastName);
                    done();
                });
        });

        it('it should require {phone, description}', (done) => {
            chai.request(server)
                .post('/student/1/2')
                .send({
                    'requirements': {
                        'phone': 1,
                        'description': 1
                    },
                })
                .end((err, res) => {
                    expect(err).to.be.null;
                    expect(res.body).to.be.an('array');
                    expect(res.body.length).to.be.eql(2);
                    expect(res.body[0]).to.be.an('object');
                    expect(res.body[0]).to.have.all.keys(
                        '_id', 'phone', 'description'
                    );
                    expect(res.body[0]).to.not.have.all.keys(
                        'credentials', 'firstName', 'lastName'
                    )
                    expect(res.body[1]).to.be.an('object');
                    expect(res.body[1]).to.have.all.keys(
                        '_id', 'phone', 'description'
                    );
                    expect(res.body[1]).to.not.have.all.keys(
                        'credentials', 'firstName', 'lastName'
                    )
                    expect(res.body[0]._id).to.be.eql(studentids[1]);
                    expect(res.body[0].phone).to.be.eql(students[1].phone);
                    expect(res.body[0].description).to.be.eql(students[1].description);
                    expect(res.body[1]._id).to.be.eql(studentids[0]);
                    expect(res.body[1].phone).to.be.eql(students[0].phone);
                    expect(res.body[1].description).to.be.eql(students[0].description);
                    done();
                });
        });

        it('it shouldn\'t get password', (done) => {
            chai.request(server)
                .post('/student/0/1')
                .send({
                    'requirements': {
                        'credentials.password': 1,
                    },
                })
                .end((err, res) => {
                    expect(err).to.be.null;
                    expect(res.body).to.be.an('array');
                    expect(res.body.length).to.be.eql(1);
                    expect(res.body[0]).to.not.have.keys(
                        'credentials', 'phone', 'firstName', 'lastName', 'description');
                    done();
                });
        });
    });

    describe('/POST /student/:id', () => {
        it('it should require {email, phone, firstName}', (done) => {
            chai.request(server)
                .post('/student/' + studentids[0])
                .send({
                    'requirements': {
                        'credentials.email': 1,
                        'phone': 1,
                        'firstName': 1
                    },
                })
                .end((err, res) => {
                    expect(err).to.be.null;
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.have.all.keys(
                        '_id', 'credentials', 'phone', 'firstName'
                    );
                    expect(res.body.credentials).to.have.key('email');
                    expect(res.body.credentials).to.not.have.key('password');
                    expect(res.body).to.not.have.all.keys(
                        'lastName', 'description'
                    )
                    expect(res.body._id).to.be.eql(studentids[0]);
                    expect(res.body.credentials.email).to.be.eql(students[0].credentials.email);
                    expect(res.body.firstName).to.be.eql(students[0].firstName);
                    expect(res.body.phone).to.be.eql(students[0].phone);
                    done();
                });
        });

        it('it shouldn\'t get password', (done) => {
            chai.request(server)
                .post('/student/' + studentids[0])
                .send({
                    'requirements': {
                        'credentials.password': 1,
                    },
                })
                .end((err, res) => {
                    expect(err).to.be.null;
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.not.have.keys(
                        'credentials', 'phone', 'firstName', 'lastName', 'description');
                    done();
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
