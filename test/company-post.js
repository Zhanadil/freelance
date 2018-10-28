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

describe('Company POST requests', () => {
    const newUser = {
        credentials: {
            method: 'local',
            email: faker.internet.email().toLowerCase(),
            password: faker.internet.password()
        },
        name: faker.company.companyName(),
    };
    const name = faker.company.companyName();
    const phone = faker.phone.phoneNumber();
    const description = faker.lorem.sentences();
    var token;
    var id;

    before((done) => {
        mongoose.connect(config.DBHost);
        mongoose.connection.dropDatabase(() => {
            var company = new Company(newUser);
            company.save(function(err, savedCompany) {
                token = JWT.sign({
                        iss: 'john',
                        sub: {
                            id: savedCompany.id,
                            email: savedCompany.credentials.email,
                        },
                        iat: Date.now(),
                        exp: new Date().setDate(new Date().getDate() + 1)
                    }, JWT_SECRET);
                id = savedCompany.id;
                done();
            });
        });
    });

    describe('/POST /private', () => {
        describe('name', () => {
            it('it should post name', (done) => {
                chai.request(server)
                    .post('/company/private/name')
                    .set('Authorization', token)
                    .send({'name': name})
                    .end((err, res) => {
                        expect(err).to.be.null;
                        res.should.have.status(200);
                        res.body.should.be.an('object');
                        res.body.should.have.property('status');
                        expect(res.body.status).to.be.eql('ok');
                        Company.findById(id, function(err, company) {
                            expect(err).to.be.null;
                            expect(company).not.to.be.null;
                            expect(company.name).to.be.eql(name);
                            done();
                        });
                    });
            });

            it('it shouldn\'t post name without token', (done) => {
                chai.request(server)
                    .post('/company/private/name')
                    .send({'name': name})
                    .end((err, res) => {
                        expect(err).to.be.null;
                        res.should.have.status(401);
                        res.should.have.property('text');
                        res.text.should.be.eql('Unauthorized');
                        done();
                    });
            });

            it('it shouldn\'t post name without name property', (done) => {
                chai.request(server)
                    .post('/company/private/name')
                    .set('Authorization', token)
                    .send({})
                    .end((err, res) => {
                        expect(err).to.be.null;
                        res.should.have.status(400);
                        res.body.should.be.an('object');
                        res.body.should.have.property('error');
                        expect(res.body.error).to.be.eql('name not received');
                        done();
                    });
            });
        });

        describe('phone', () => {
            it('it should post phone', (done) => {
                chai.request(server)
                    .post('/company/private/phone')
                    .set('Authorization', token)
                    .send({'phone': phone})
                    .end((err, res) => {
                        expect(err).to.be.null;
                        res.should.have.status(200);
                        res.body.should.be.an('object');
                        res.body.should.have.property('status');
                        expect(res.body.status).to.be.eql('ok');
                        Company.findById(id, function(err, company) {
                            expect(err).to.be.null;
                            expect(company).not.to.be.null;
                            expect(company.phone).to.be.eql(phone);
                            done();
                        });
                    });
            });

            it('it shouldn\'t post phone without token', (done) => {
                chai.request(server)
                    .post('/company/private/phone')
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
                    .post('/company/private/phone')
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
                    .post('/company/private/description')
                    .set('Authorization', token)
                    .send({'description': description})
                    .end((err, res) => {
                        expect(err).to.be.null;
                        res.should.have.status(200);
                        res.body.should.be.an('object');
                        res.body.should.have.property('status');
                        expect(res.body.status).to.be.eql('ok');
                        Company.findById(id, function(err, company) {
                            expect(err).to.be.null;
                            expect(company).not.to.be.null;
                            expect(company.description).to.be.eql(description);
                            done();
                        });
                    });
            });

            it('it shouldn\'t post description without token', (done) => {
                chai.request(server)
                    .post('/company/private/description')
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
                    .post('/company/private/description')
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
