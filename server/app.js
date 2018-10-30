const express = require('express');
const morgan = require('morgan');
const body_parser = require('body-parser');
const mongoose = require('mongoose');
const config = require('config');
const fs = require('fs');
const path = require('path');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const JWT = require('jsonwebtoken');
const http = require('http');

const mailer = require('@lib/mailer');
mailer.init(
    'znurtoleuov@gmail.com',
    '3.3&d6Q,oL'
);

const app = express();
const server = http.createServer(app);

// Инициализируем сокетный сервер
require('@root/socket')(server);

const logger = require('@root/logger');
const adminRouter = require('@routes/admin');
const studentRouter = require('@routes/student');
const companyRouter = require('@routes/company');
const generalRouter = require('@routes/general');

const { JWT_SECRET } = require('@configuration');

mongoose.Promise = global.Promise;
let connectionOptions = {
    auth: {
        authSource: "admin"
    },
    useNewUrlParser: true
};
if (config.util.getEnv('NODE_ENV') !== 'production') {
    connectionOptions.auth = undefined;
}
mongoose.connect(
    config.DBHost,
    connectionOptions,
    function(err, db){
        if(err){
            console.log(`${err.message}`);
            //logger.emerg(`mongodb error: ${err.message}`);
        } else {
            logger.info('mongodb successfully started');
        }
    }
)

app.use(body_parser.json());
app.use(fileUpload());
app.use(cors());

// Log all requests
app.use((req, res, next) => {
    // If no token received
    if (req.headers.authorization === undefined) {
        logger.info(req.url, {info: "no token"})
        next();
    } else {
        // If token is received, then decode
        JWT.verify(req.headers.authorization, JWT_SECRET, (err, decoded) => {
            if (err) {
                logger.info(req.url, {info: "incorrect token"});
            } else {
                // If token is correct, then log credentials
                logger.info(req.url, {sub: decoded.sub});
            }
            next();
        });
    }
});

app.use('/admin', adminRouter);
app.use('/student', studentRouter);
app.use('/company', companyRouter);
app.use('/', generalRouter);

app.use((req, res, next) => {
    return res.status(404).send('sorry, page not found');
});

app.use((err, req, res, next) => {
    // TODO: log this.
    return res.status(err.status || 500).json({
        error: err.message
    });
});

module.exports = server;
