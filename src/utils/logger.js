const winston = require('winston');
const path = require('path');
const config = require('../../config.json');

// Configuração do logger
const logger = winston.createLogger({
    level: config.sync.logLevel || 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'whatsapp-bot' },
    transports: [
        // Arquivo de log
        new winston.transports.File({ 
            filename: path.join(__dirname, '../../', config.logging.logFile),
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        // Console
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

// Métodos específicos para diferentes tipos de log
const botLogger = {
    info: (message, meta = {}) => {
        if (config.logging.enableSyncLogs) {
            logger.info(message, meta);
        }
    },
    
    error: (message, error = null, meta = {}) => {
        if (config.logging.enableErrorLogs) {
            logger.error(message, { 
                error: error ? error.stack || error.message || error : null,
                ...meta 
            });
        }
    },
    
    warn: (message, meta = {}) => {
        logger.warn(message, meta);
    },
    
    debug: (message, meta = {}) => {
        logger.debug(message, meta);
    },
    
    api: (message, meta = {}) => {
        if (config.logging.enableApiLogs) {
            logger.info(`[API] ${message}`, meta);
        }
    }
};

module.exports = botLogger;