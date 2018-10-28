const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const GooglePlusTokenStrategy = require('passport-google-plus-token');
const { ExtractJwt } = require('passport-jwt');

const to = require('await-to-js').default;

const { JWT_SECRET, GOOGLE_ID, GOOGLE_SECRET } = require('@configuration');
const Student = require('@models/student');
const Company = require('@models/company');

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

// Log in by "Sign in with Google" button
passport.use('googleToken-student', new GooglePlusTokenStrategy({
    clientID: GOOGLE_ID,
    clientSecret: GOOGLE_SECRET
}, async(accessToken, refreshToken, profile, done) => {
    try {
        // Student registered via "Sign in with Google"
        const existingStudent = await Student.findOne({ "googleId": profile.id  });
        if (existingStudent) {
            return done(null, existingStudent);
        }

        // Find student registered locally via email and password and set his
        // google id
        const locallyRegStudent = await Student.findOneAndUpdate(
            // Filter by email
            {
                "email": profile.emails[0].value
            },
            // Update google id
            {
                "googleId": profile.id
            },
            // Return updated document: true
            {
                new: true
            },
        );
        if (locallyRegStudent) {
            return done(null, locallyRegStudent);
        }

        const newStudent = new Student({
            method: 'google',
            google_id: profile.id,
            email: profile.emails[0].value,
        });

        await newStudent.save();
        return done(null, newStudent);
    } catch(error) {
        return done(error, false, error.message);
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

// Log in by "Sign in with Google" button
passport.use('googleToken-company', new GooglePlusTokenStrategy({
    clientID: GOOGLE_ID,
    clientSecret: GOOGLE_SECRET
}, async(accessToken, refreshToken, profile, done) => {
    try {
        // Company registered via "Sign in with Google"
        const existingCompany = await Company.findOne({ "googleId": profile.id  });
        if (existingCompany) {
            return done(null, existingCompany);
        }

        // Find student registered locally via email and password and set his
        // google id
        const locallyRegCompany = await Company.findOneAndUpdate(
            // Filter by email
            {
                "credentials.email": profile.emails[0].value
            },
            // Update google id
            {
                "credentials.googleId": profile.id
            },
            // Return updated document: true
            {
                new: true
            },
        );
        if (locallyRegCompany) {
            return done(null, locallyRegCompany);
        }

        const newCompany = new Company({
            method: 'google',
            google_id: profile.id,
            email: profile.emails[0].value,
        });

        await newCompany.save();
        return done(null, newCompany);
    } catch(error) {
        return done(error, false, error.message);
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
