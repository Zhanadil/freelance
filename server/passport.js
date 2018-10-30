const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const { ExtractJwt } = require('passport-jwt');

const to = require('await-to-js').default;

const JWT_SECRET = require('config').get('JWT_SECRET');
const Student = require('@models/student');
const { Company } = require('@models/company');

// *************************** Student Passport **************************

// Accessing Website by JsonWebToken
passport.use('jwt-admin', new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromHeader('authorization'),
    secretOrKey: JWT_SECRET
}, async (payload, done) => {
    try {
        const student = await Student.findById(payload.sub.id);

        if (!student) {
            return done(null, false);
        }

        if (student.userType !== "admin") {
            return done(null, false);
        }

        return done(null, student);
    } catch(error) {
        return done(error, false);
    }
}));

// Accessing Website by JsonWebToken
passport.use('jwt-student', new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromHeader('authorization'),
    secretOrKey: JWT_SECRET
}, async (payload, done) => {
    try {
        const student = await Student.findById(payload.sub.id);

        if (!student) {
            return done(null, false);
        }

        return done(null, student);
    } catch(error) {
        return done(error, false);
    }
}));

// Standard log in by email
passport.use('local-student', new LocalStrategy({
    usernameField: 'email'
}, async(email, password, done) => {
    var err, student;
    [err, student] = await to(
        Student.findOne({
            'credentials.email': email
        })
        .select('+credentials.password')
    );
    if (err) {
        return done(err, false);
    }
    if (!student) {
        return done(null, false);
    }

    const isMatch = await student.credentials.isValidPassword(password);

    if (!isMatch) {
        return done(null, false);
    }

    return done(null, student);
}));

// *************************** Company Passport **************************

// Accessing Website by JsonWebToken
passport.use('jwt-company', new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromHeader('authorization'),
    secretOrKey: JWT_SECRET
}, async (payload, done) => {
    try {
        const company = await Company.findById(payload.sub.id);

        if (!company) {
            return done(null, false);
        }

        return done(null, company);
    } catch(error) {
        return done(error, false);
    }
}));

// Standard log in by email
passport.use('local-company', new LocalStrategy({
    usernameField: 'email'
}, async(email, password, done) => {
    var err, company;
    [err, company] = await to(
        Company.findOne({
            'credentials.email': email
        })
        .select('+credentials.password')
    );
    if (err) {
        return done(err, false);
    }
    if (!company) {
        return done(null, false);
    }

    const isMatch = await company.credentials.isValidPassword(password);

    if (!isMatch) {
        return done(null, false);
    }

    return done(null, company);
}));
