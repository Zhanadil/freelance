const winston = require('winston');
const config = require('config');
const format = winston.format;

// Logger logs both to files located in logs/ and to console.
// If it's in production, then it logs only everything above warn level to console.
// format is "${timestamp} [${userInfo}] ${log_level}: ${message}"
const logger = winston.createLogger({
    transports: [
        new winston.transports.File({
            filename: config.util.getEnv('NODE_ENV') === 'dev'
                ? `${config.LOGS_DIRECTORY}/access_dev.log` : `${config.LOGS_DIRECTORY}/access_prod.log`,
            level: config.util.getEnv('NODE_ENV') === 'dev' ? 'debug' : 'info',
        }),
        new winston.transports.Console({
            level: config.util.getEnv('NODE_ENV') === 'dev' ? 'debug' : 'warn',
        })
    ],
    format: format.combine(
            format.timestamp(),
            format.printf(options => {
                var userInfo = undefined;
                // If user credentials are not received, then try to print info parameter,
                // otherwise print "general log"
                if (options.sub === undefined) {
                    userInfo = options.info || "general log";
                } else {
                    // If user credentials are received, then print ${user type}/${user id}
                    userInfo = (options.sub.type + "/" + options.sub.id);
                }
                return `${options.timestamp} ` +
                       `[${userInfo}] ` +
                       `${options.level}: ${options.message}`
            }
        )
    )
});

module.exports = logger;
