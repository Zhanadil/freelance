//During the test the env variable is set to test
require('module-alias/register');

const mongoose = require("mongoose");
const Company = require('@models/company');
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

describe('Company get requests', () => {
    const newUser = {
        credentials: {
            method: 'local',
            email: faker.internet.email().toLowerCase(),
            password: faker.internet.password()
        },
        name: faker.company.companyName(),
        phone: faker.phone.phoneNumber(),
        description: faker.lorem.sentences(),
    };
    var token;

    before((done) => {
        mongoose.connect(config.DBHost);
        mongoose.connection.dropDatabase(() => {
            var company = new Company(newUser);
            company.save(function(err, company) {
                token = JWT.sign({
                        iss: 'john',
                        sub: {
                            id: company.id,
                            email: company.credentials.email,
                        },
                        iat: Date.now(),
                        exp: new Date().setDate(new Date().getDate() + 1)
                    }, JWT_SECRET);
                done();
            });
        });
    });

    describe('/GET /private', () => {
        describe('name', () => {
            it('it should get name', (done) => {
                chai.request(server)
                    .get('/company/private/name')
                    .set('Authorization', token)
                    .end((err, res) => {
                        expect(err).to.be.null;
                        res.should.have.status(200);
                        res.body.should.be.an('object');
                        res.body.should.have.property('name');
                        expect(res.body.name).to.be.eql(newUser.name);
                        done();
                    });
            });

            it('it shouldn\'t get name without token', (done) => {
                chai.request(server)
                    .get('/company/private/name')
                    .end((err, res) => {
                        expect(err).to.be.null;
                        res.should.have.status(401);
                        res.should.have.property('text');
                        res.text.should.be.eql('Unauthorized');
                        done();
                    });
            });
        });

        describe('phone', () => {
            it('it should get phone', (done) => {
                chai.request(server)
                    .get('/company/private/phone')
                    .set('Authorization', token)
                    .end((err, res) => {
                        expect(err).to.be.null;
                        res.should.have.status(200);
                        res.body.should.be.an('object');
                        res.body.should.have.property('phone');
                        expect(res.body.phone).to.be.eql(newUser.phone);
                        done();
                    });
            });

            it('it shouldn\'t get phone without token', (done) => {
                chai.request(server)
                    .get('/company/private/phone')
                    .end((err, res) => {
                        expect(err).to.be.null;
                        res.should.have.status(401);
                        res.should.have.property('text');
                        res.text.should.be.eql('Unauthorized');
                        done();
                    });
            });
        });

        describe('description', () => {
            it('it should get description', (done) => {
                chai.request(server)
                    .get('/company/private/description')
                    .set('Authorization', token)
                    .end((err, res) => {
                        expect(err).to.be.null;
                        res.should.have.status(200);
                        res.body.should.be.an('object');
                        res.body.should.have.property('description');
                        expect(res.body.description).to.be.eql(newUser.description);
                        done();
                    });
            });

            it('it shouldn\'t get description without token', (done) => {
                chai.request(server)
                    .get('/company/private/description')
                    .end((err, res) => {
                        expect(err).to.be.null;
                        res.should.have.status(401);
                        res.should.have.property('text');
                        res.text.should.be.eql('Unauthorized');
                        done();
                    });
            });
        });

        describe('profile', () => {
            it('it should get profile', (done) => {
                chai.request(server)
                    .get('/company/private/profile')
                    .set('Authorization', token)
                    .end((err, res) => {
                        expect(err).to.be.null;
                        res.should.have.status(200);
                        res.body.should.be.an('object');
                        res.body.should.have.property('id');
                        res.body.should.have.property('email');
                        expect(res.body.email).to.be.eql(newUser.credentials.email);
                        res.body.should.have.property('name');
                        expect(res.body.name).to.be.eql(newUser.name);
                        res.body.should.have.property('phone');
                        expect(res.body.phone).to.be.eql(newUser.phone);
                        res.body.should.have.property('description');
                        expect(res.body.description).to.be.eql(newUser.description);
                        done();
                    });
            });

            it('it shouldn\'t get profile without token', (done) => {
                chai.request(server)
                    .get('/company/private/profile')
                    .end((err, res) => {
                        expect(err).to.be.null;
                        res.should.have.status(401);
                        res.should.have.property('text');
                        res.text.should.be.eql('Unauthorized');
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
