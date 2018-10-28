//During the test the env variable is set to test
require('module-alias/register');

const mongoose = require("mongoose");
const Company = require('@models/company');
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

describe('Company authorization methods', () => {
    const newUser = {
        email: faker.internet.email().toLowerCase(),
        password: faker.internet.password(),
        name: faker.company.companyName(),
    };
    const existingUser = {
        email: newUser.email,
        password: newUser.password,
    };
    const unexistingUser = {
        email: faker.internet.email().toLowerCase(),
        password: faker.internet.password()
    };
    const wrongEmailUser = {
        email: 'asd@gmail',
        password: faker.internet.password(),
        name: faker.company.companyName(),
    };

    before((done) => {
        mongoose.connect(config.DBHost);
        mongoose.connection.dropDatabase(() => {
            done();
        });
    });

    describe('/POST /company/auth/signup', () => {
        it('it should be able to sign up', (done) => {
            chai.request(server)
                .post('/company/auth/signup')
                .send(newUser)
                .end((err, res) => {
                    expect(err).to.be.null;
                    res.should.have.status(200);
                    res.body.should.be.an('object');
                    res.body.should.have.property('token');
                    JWT.verify(res.body.token, JWT_SECRET, function(err, decoded) {
                        expect(err).to.be.null;
                        expect(decoded).to.have.property('sub');
                        expect(decoded.sub).to.have.property('id');
                        Company.findById(decoded.sub.id, function(err, company) {
                            expect(company.credentials.email).to.be.eql(newUser.email);
                            expect(company.name).to.be.eql(newUser.name);
                            done();
                        });
                    });
                });
        });

        it('it should not signup with wrong email', (done) => {
            chai.request(server)
                .post('/company/auth/signup')
                .send(wrongEmailUser)
                .end((err, res) => {
                    expect(err).to.be.null;
                    res.should.have.status(400);
                    res.body.should.be.an('object');
                    res.body.should.have.property('details');
                    expect(res.body.details[0].message).to.be.eql('\"email\" must be a valid email');
                    done();
                });
        });

        it('it should not signup without email', (done) => {
            chai.request(server)
                .post('/company/auth/signup')
                .send({ password: newUser.password, name: newUser.name })
                .end((err, res) => {
                    expect(err).to.be.null;
                    res.should.have.status(400);
                    res.body.should.be.an('object');
                    res.body.should.have.property('details');
                    expect(res.body.details[0].message).to.be.eql('\"email\" is required');
                    done();
                });
        });

        it('it should not signup without password', (done) => {
            chai.request(server)
                .post('/company/auth/signup')
                .send({ email: newUser.email, name: newUser.name })
                .end((err, res) => {
                    expect(err).to.be.null;
                    res.should.have.status(400);
                    res.body.should.be.an('object');
                    res.body.should.have.property('details');
                    expect(res.body.details[0].message).to.be.eql('\"password\" is required');
                    done();
                });
        });

        it('it should not signup without companyName', (done) => {
            chai.request(server)
                .post('/company/auth/signup')
                .send({ email: newUser.email, password: newUser.password })
                .end((err, res) => {
                    expect(err).to.be.null;
                    res.should.have.status(400);
                    res.body.should.be.an('object');
                    res.body.should.have.property('details');
                    expect(res.body.details[0].message).to.be.eql('\"name\" is required');
                    done();
                });
        });
    });

    // All requests after signing up
    describe('Company after sign up', () => {
        var token;

        describe('/POST /company/auth/signin', () => {
            it('it should sign in only existing companies', (done) => {
                chai.request(server)
                    .post('/company/auth/signin')
                    .send(unexistingUser)
                    .end((err, res) => {
                        expect(err).to.be.null;
                        res.should.have.status(401);
                        res.should.have.property('text');
                        expect(res.text).to.be.eql('Unauthorized');
                        done();
                    });
            });

            it('it should be able to sign in', (done) => {
                chai.request(server)
                    .post('/company/auth/signin')
                    .send(existingUser)
                    .end((err, res) => {
                        expect(err).to.be.null;
                        res.should.have.status(200);
                        res.body.should.be.an('object');
                        res.body.should.have.property('token');
                        token = res.body.token;
                        JWT.verify(res.body.token, JWT_SECRET, function(err, decoded) {
                            expect(err).to.be.null;
                            expect(decoded).to.have.property('sub');
                            expect(decoded.sub).to.have.property('id');
                            Company.findById(decoded.sub.id, function(err, company) {
                                expect(company.credentials.email).to.be.eql(newUser.email);
                                expect(company.name).to.be.eql(newUser.name);
                                done();
                            });
                        });
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
