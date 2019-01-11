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
const https = require('https');
const ip = require('ip');
const mkdirp = require('mkdirp');

const router = require('@routes');
const mailer = require('@lib/mailer');

const applySockets = require('@root/socket');

class App {
    constructor() {
        let configError = this.checkConfigs();
        if (configError) {
            console.log(configError);
            process.exit(2);
        }

        let JWT_SECRET = this.JWT_SECRET = config.get('JWT_SECRET');
        this.env = process.env.NODE_ENV;
        this.port = process.env.PORT || 3000;
        this.httpsPort = process.env.HTTPS_PORT || 3443;
        this.host = process.env.HOST || ip.address();
        this.logs_directory = config.get('LOGS_DIRECTORY');
        this.resources_directory = config.get('RESOURCES_DIRECTORY');
        this.privateKey = fs.readFileSync('/etc/letsencrypt/live/love2work.kz/privkey.pem', 'utf8');
        this.certificate = fs.readFileSync('/etc/letsencrypt/live/love2work.kz/fullchain.pem', 'utf8');
        this.sslCredentials = {
            key: this.privateKey,
            cert: this.certificate
        };

        // Создаем папки с логами и ресурсами если их нет.
        this.ensureDirectories();

        this.express = Express();
        this.httpServer = http.createServer(this.express);
        this.httpsServer = https.createServer(this.sslCredentials, this.express);

        // Инициализируем сокетный сервер
        applySockets(this.httpServer);
        applySockets(this.httpsServer);

        mailer.init(
            config.get('email'),
            config.get('mail_password')
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
            (err, db) => {
                if(err){
                    console.log(err);
                    process.exit(1);
                }
                this.applyRouters(this.express);
            }
        )
    }

    checkConfigs() {
        if (!config.has('RESOURCES_DIRECTORY')) {
            return 'Resources directory path has not been declared';
        }
        if (!config.has('LOGS_DIRECTORY')) {
            return 'Logs directory path has not been declared';
        }
        if (!config.has('JWT_SECRET')) {
            return 'JWT secret has not been declared';
        }
        return null;
    }

    ensureDirectories() {
        try {
            let ldir = mkdirp.sync(this.logs_directory);
            mkdirp.sync(this.logs_directory);
            let stats = fs.statSync(this.logs_directory)
            mkdirp.sync(this.resources_directory);
        } catch(err) {
            console.log('Could not create directories');
            console.log(err);
            process.exit(3);
        }
    }

    applyRouters(express) {
        if (!express) {
            express = this.express;
        }

        // Подключаем нужные нам миддлы
        express.use(body_parser.json());
        express.use(fileUpload());
        express.use(cors());

        // Логгер обязательно должен быть вызван после создания папок с логами
        // Иначе может крашнуться.
        express.use(require('@root/logger'));

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
