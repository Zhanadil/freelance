//During the test the env variable is set to test
require('module-alias/register');

const mongoose = require("mongoose");
const Company = require('@models/company');
const { Vacancy } = require('@models/vacancy');
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
    var vacancies = [{
            description: faker.lorem.words(),
            demands: [faker.lorem.words()],
            type: ['internship', 'part-time'],
            minSalary: 100000,
            maxSalary: 150000,
            vacancyField: 'IT',
            vacancyName: 'SWE Intern',
            companyId: '1',
            companyName: 'company1',
        },{
            description: faker.lorem.words(),
            demands: [faker.lorem.words()],
            type: ['part-time', 'full-time'],
            minSalary: 150000,
            maxSalary: 200000,
            vacancyField: 'IT',
            vacancyName: 'SWE',
            companyId: '2',
            companyName: 'company2',
        },{
            description: faker.lorem.words(),
            demands: [faker.lorem.words()],
            type: ['full-time'],
            minSalary: 200000,
            maxSalary: 300000,
            vacancyField: 'medicine',
            vacancyName: 'doctor',
            companyId: '3',
            companyName: 'company3',
        },{
            description: faker.lorem.words(),
            demands: [faker.lorem.words()],
            type: ['internship'],
            minSalary: 100000,
            maxSalary: 300000,
            vacancyField: 'medicine',
            vacancyName: 'doctor',
            companyId: '4',
            companyName: 'company4',
        }];
    var vacancyids = [];
    before((done) => {
        mongoose.connect(config.DBHost);
        mongoose.connection.dropDatabase(() => {
            new Vacancy(vacancies[0]).save((err, vacancy) => {
                expect(err).to.be.null;
                vacancyids[0] = vacancy.id;
                new Vacancy(vacancies[1]).save((err, vacancy) => {
                    expect(err).to.be.null;
                    vacancyids[1] = vacancy.id;
                    new Vacancy(vacancies[2]).save((err, vacancy) => {
                        expect(err).to.be.null;
                        vacancyids[2] = vacancy.id;
                        new Vacancy(vacancies[3]).save((err, vacancy) => {
                            expect(err).to.be.null;
                            vacancyids[3] = vacancy.id;
                            done();
                        });
                    });
                });
            });
        });
    });

    describe('/POST /vacancy/ids/:page/:limit', () => {
        it('it should get 2 elements with max of 2', (done) => {
            chai.request(server)
                .post('/vacancy/ids/0/2')
                .end((err, res) => {
                    expect(err).to.be.null;
                    expect(res.body).to.be.an('array');
                    expect(res.body.length).to.be.eql(2);
                    expect(res.body[0]).to.be.eql(vacancyids[3]);
                    expect(res.body[1]).to.be.eql(vacancyids[2]);
                    done();
                });
        });

        it('it should get 4 elements with max of 10', (done) => {
            chai.request(server)
                .post('/vacancy/ids/0/10')
                .end((err, res) => {
                    expect(err).to.be.null;
                    expect(res.body).to.be.an('array');
                    expect(res.body.length).to.be.eql(4);
                    expect(res.body[0]).to.be.eql(vacancyids[3]);
                    expect(res.body[1]).to.be.eql(vacancyids[2]);
                    expect(res.body[2]).to.be.eql(vacancyids[1]);
                    expect(res.body[3]).to.be.eql(vacancyids[0]);
                    done();
                });
        });

        it('it should get 0 elements', (done) => {
            chai.request(server)
                .post('/vacancy/ids/1/10')
                .end((err, res) => {
                    expect(err).to.be.null;
                    expect(res.body).to.be.an('array');
                    expect(res.body.length).to.be.eql(0);
                    done();
                });
        });

        it('it should get 1 element with max of 3', (done) => {
            chai.request(server)
                .post('/vacancy/ids/1/3')
                .end((err, res) => {
                    expect(err).to.be.null;
                    expect(res.body).to.be.an('array');
                    expect(res.body.length).to.be.eql(1);
                    expect(res.body[0]).to.be.eql(vacancyids[0]);
                    done();
                });
        });

        it('it should get 2 elements with maxSalary and vacancyField filters', (done) => {
            chai.request(server)
                .post('/vacancy/ids/0/10')
                .send({'filter': {
                    'maxSalary': '150000',
                    'vacancyField': 'medicine',
                }})
                .end((err, res) => {
                    expect(err).to.be.null;
                    expect(res.body).to.be.an('array');
                    expect(res.body.length).to.be.eql(1);
                    expect(res.body[0]).to.be.eql(vacancyids[3]);
                    done();
                });
        });

        it('it should get 2 elements with minSalary and type filters', (done) => {
            chai.request(server)
                .post('/vacancy/ids/0/10')
                .send({'filter': {
                    'minSalary': '200000',
                    'type': ['full-time', 'internship'],
                }})
                .end((err, res) => {
                    expect(err).to.be.null;
                    expect(res.body).to.be.an('array');
                    expect(res.body.length).to.be.eql(3);
                    expect(res.body[0]).to.be.eql(vacancyids[3]);
                    expect(res.body[1]).to.be.eql(vacancyids[2]);
                    expect(res.body[2]).to.be.eql(vacancyids[1]);
                    done();
                });
        });
    });

    describe('/POST /vacancy/:page/:limit', () => {
        it('it should require {description, demands, type, companyName, minSalary, maxSalary}', (done) => {
            chai.request(server)
                .post('/vacancy/0/2')
                .send({
                    'requirements': {
                        'description': 1,
                        'demands': 1,
                        'type': 1,
                        'companyName': 1,
                        'minSalary': 1,
                        'maxSalary': 1,
                    },
                })
                .end((err, res) => {
                    expect(err).to.be.null;
                    expect(res.body).to.be.an('array');
                    expect(res.body.length).to.be.eql(2);
                    expect(res.body[0]).to.be.an('object');
                    expect(res.body[0]).to.have.all.keys(
                        '_id', 'description', 'demands', 'type', 'companyName',
                        'minSalary', 'maxSalary'
                    );
                    expect(res.body[0]).to.not.have.all.keys(
                        'vacancyField', 'vacancyName', 'companyId'
                    )
                    expect(res.body[1]).to.be.an('object');
                    expect(res.body[1]).to.have.all.keys(
                        '_id', 'description', 'demands', 'type', 'companyName',
                        'minSalary', 'maxSalary'
                    );
                    expect(res.body[1]).to.not.have.all.keys(
                        'vacancyField', 'vacancyName', 'companyId'
                    )
                    expect(res.body[0]._id).to.be.eql(vacancyids[3]);
                    expect(res.body[0].description).to.be.eql(vacancies[3].description);
                    expect(res.body[0].demands).to.be.eql(vacancies[3].demands);
                    expect(res.body[0].type).to.be.eql(vacancies[3].type);
                    expect(res.body[0].minSalary).to.be.eql(vacancies[3].minSalary);
                    expect(res.body[0].maxSalary).to.be.eql(vacancies[3].maxSalary);
                    expect(res.body[1]._id).to.be.eql(vacancyids[2]);
                    expect(res.body[1].description).to.be.eql(vacancies[2].description);
                    expect(res.body[1].demands).to.be.eql(vacancies[2].demands);
                    expect(res.body[1].type).to.be.eql(vacancies[2].type);
                    expect(res.body[1].minSalary).to.be.eql(vacancies[2].minSalary);
                    expect(res.body[1].maxSalary).to.be.eql(vacancies[2].maxSalary);
                    done();
                });
        });
        it('it should require {vacancyField, vacancyName, companyId}', (done) => {
            chai.request(server)
                .post('/vacancy/1/2')
                .send({
                    'requirements': {
                        'vacancyField': 1,
                        'vacancyName': 1,
                        'companyId': 1,
                    },
                })
                .end((err, res) => {
                    expect(err).to.be.null;
                    expect(res.body).to.be.an('array');
                    expect(res.body.length).to.be.eql(2);
                    expect(res.body[0]).to.be.an('object');
                    expect(res.body[0]).to.have.all.keys(
                        '_id', 'vacancyField', 'vacancyName', 'companyId'
                    )
                    expect(res.body[0]).to.not.have.all.keys(
                        'description', 'demands', 'type', 'companyName',
                        'minSalary', 'maxSalary'
                    );
                    expect(res.body[1]).to.be.an('object');
                    expect(res.body[1]).to.have.all.keys(
                        '_id', 'vacancyField', 'vacancyName', 'companyId'
                    )
                    expect(res.body[1]).to.not.have.all.keys(
                        'description', 'demands', 'type', 'companyName',
                        'minSalary', 'maxSalary'
                    );
                    expect(res.body[0]._id).to.be.eql(vacancyids[1]);
                    expect(res.body[0].vacancyField).to.be.eql(vacancies[1].vacancyField);
                    expect(res.body[0].vacancyName).to.be.eql(vacancies[1].vacancyName);
                    expect(res.body[0].companyId).to.be.eql(vacancies[1].companyId);
                    expect(res.body[1]._id).to.be.eql(vacancyids[0]);
                    expect(res.body[1].vacancyField).to.be.eql(vacancies[0].vacancyField);
                    expect(res.body[1].vacancyName).to.be.eql(vacancies[0].vacancyName);
                    expect(res.body[1].companyId).to.be.eql(vacancies[0].companyId);
                    done();
                });
        });
    });

    describe('/POST /vacancy/:id', () => {
        it('it should require {description, demands, type, companyName, minSalary, maxSalary}', (done) => {
            chai.request(server)
                .post('/vacancy/' + vacancyids[0])
                .send({
                    'requirements': {
                        'description': 1,
                        'demands': 1,
                        'type': 1,
                        'companyName': 1,
                        'minSalary': 1,
                        'maxSalary': 1,
                    },
                })
                .end((err, res) => {
                    expect(err).to.be.null;
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.have.all.keys(
                        '_id', 'description', 'demands', 'type', 'companyName',
                        'minSalary', 'maxSalary'
                    );
                    expect(res.body).to.not.have.all.keys(
                        'vacancyField', 'vacancyName', 'companyId'
                    )
                    expect(res.body._id).to.be.eql(vacancyids[0]);
                    expect(res.body.description).to.be.eql(vacancies[0].description);
                    expect(res.body.demands).to.be.eql(vacancies[0].demands);
                    expect(res.body.type).to.be.eql(vacancies[0].type);
                    expect(res.body.minSalary).to.be.eql(vacancies[0].minSalary);
                    expect(res.body.maxSalary).to.be.eql(vacancies[0].maxSalary);
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
