const Express = require('express');
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

const logger = require('@root/logger');
const router = require('@routes');
const mailer = require('@lib/mailer');

const applySockets = require('@root/socket');

class App {
    constructor() {
        let JWT_SECRET = this.JWT_SECRET = config.get('JWT_SECRET');
        this.env = config.util.getEnv('NODE_ENV');
        this.port = config.util.getEnv('PORT') || 3000;

        let express = this.express = Express();
        this.server = http.createServer(express);

        // Инициализируем сокетный сервер
        applySockets(this.server);

        mailer.init(
            'znurtoleuov@gmail.com',
            '3.3&d6Q,oL'
        );

        // Подключаем базу данных
        mongoose.Promise = global.Promise;
        let connectionOptions = {
            auth: {
                authSource: "admin"
            },
            useNewUrlParser: true
        };
        if (this.env !== 'production') {
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

        // Подключаем нужные нам миддлы
        express.use(body_parser.json());
        express.use(fileUpload());
        express.use(cors());

        // Подключаем логгер
        express.use((req, res, next) => {
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

        // Подключаем роутеры
        express.use('/', router);

        // Обработка 404
        express.use((req, res, next) => {
            return res.status(404).send('sorry, page not found');
        });

        // Обработка ошибок
        express.use((err, req, res, next) => {
            // TODO: log this.
            return res.status(err.status || 500).json({
                error: err.message
            });
        });
    }
}

module.exports = new App();
