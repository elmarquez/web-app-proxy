/**
 * Application server.
 */
const bodyParser = require('body-parser');
const config = require('config');
const cookieParser = require('cookie-parser');
const ejs = require('ejs');
const express = require('express');
const logger = require('express-pino-logger')();
const mongoose = require('mongoose');
const passport = require('passport');
const path = require('path');
const pino = require('pino')();
const Promise = require('bluebird');
const session = require('express-session');

// environment ----------------------------------------------------------------

// Disable authentication
const DISABLE_AUTH = config.get('DISABLE_AUTH');
if (DISABLE_AUTH === 'true' || DISABLE_AUTH === '1') {
  pino.info('Authentication is disabled', DISABLE_AUTH);
}

pino.info('API URL', config.get("API"));
pino.info('UI URL', config.get("UI"));


// application ----------------------------------------------------------------


/**
 * Create express application.
 * See discussion on upload size limit here https://stackoverflow.com/questions/19917401/error-request-entity-too-large
 * @param {Object} ctx Server context
 * @returns {Promise}
 */
function createApplication (ctx) {
  let MongoStore = require('connect-mongo')(session);
  ctx.app = express();
  ctx.app.use(bodyParser.json({limit: ctx.CFG.UPLOAD_SIZE_LIMIT, type: 'application/json'}));
  ctx.app.use(bodyParser.urlencoded({extended: true}));
  ctx.app.use(cookieParser(ctx.CFG.SESSION.SECRET));
  ctx.app.use(logger);
  ctx.app.use(session({
    secret: ctx.CFG.SESSION.SECRET,
    session: ctx.CFG.SESSION,
    store: new MongoStore({
      url: ctx.CFG.DB_URL,
      autoRemove: ctx.CFG.SESSION.STORE.AUTO_REMOVE,
      autoRemoveInterval: ctx.CFG.SESSION.STORE.AUTO_REMOVE_INTERVAL
    }),
    resave: ctx.CFG.SESSION.RESAVE,
    saveUninitialized: ctx.CFG.SESSION.SAVE_UNINITIALIZED
  }));
  ctx.app.use(passport.initialize());
  ctx.app.use(passport.session());

  ctx.app.set('view engine', 'ejs');
  // ctx.app.use(express.static(__dirname + '/views'));

  return ctx;
}

/**
 * Create application shutdown handlers.
 * @param {Object} ctx Server context
 * @returns {Promise}
 */
function createShutdownHandlers (ctx) {
  function handleShutdown (sig) {
    pino.info('Received %s shutdown signal', sig);
    pino.info('Stopping application');
    process.exit(0);
  }

  process.on('SIGINT', function () {
    handleShutdown('SIGINT');
  });

  process.on('SIGTERM', function () {
    handleShutdown('SIGTERM');
  });

  return ctx;
}

/**
 * Handle cross origin request.
 * @param {Object} ctx Server context
 * @returns {Promise}
 */
function handleCorsRequest (ctx) {
  if (config.get("ENABLE_CROSS_ORIGIN")) {
    ctx.app.use(function (req, res, next) {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'DELETE');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      next();
    });
  }
  return ctx;
}

/**
 * Load configuration.
 * @param {Object} ctx Server context
 * @returns {Promise}
 */
function loadConfiguration (ctx) {
  pino.info('Configuration loaded from %s', config.util.getEnv('NODE_CONFIG_DIR'));
  if (process.argv.indexOf('--show-config') > -1) {
    pino.info(config);
  }
  return Promise.resolve(ctx);
}

/**
 * Start application.
 * @param {Object} ctx Server context
 * @returns {Promise}
 */
function startApplication (ctx) {
  return new Promise(function (resolve) {
    ctx.app.listen(ctx.CFG.PORT);
    pino.info(`Application started, listening on port ${ctx.CFG.PORT}`);
    resolve();
  });
}


// database -------------------------------------------------------------------

/**
 * Connect to Mongo database.
 * @param {Object} ctx Server context
 * @returns {Promise}
 */
function connectToDatabase (ctx) {
  return new Promise(function (resolve, reject) {
    mongoose.Promise = Promise;
    if (process.argv.indexOf('--debug-mongoose') > -1) {
      pino.info('Enabled mongoose debugging');
      mongoose.set('debug', true);
    }
    pino.info('Connecting to database %s', ctx.CFG.DB_URL);
    mongoose.connect(ctx.CFG.DB_URL);
    ctx.app.locals.db = mongoose.connection;
    ctx.app.locals.db.on('error', function (err) {
      pino.error(err);
      reject(err);
    });
    ctx.app.locals.db.on('open', function () {
      pino.info('Connected to database');
      resolve(ctx);
    });
  });
}

// routes ---------------------------------------------------------------------

/**
 * Load application modules.
 * @param {Object} ctx Context
 * @returns {Promise}
 */
function loadApplicationModules (ctx) {
  let modules = config.get("MODULES");
  return new Promise(function (resolve, reject) {
    modules.forEach(function (module) {
      let p = path.join(__dirname, 'lib', module);
      pino.info('Loading module %s', module);
      require(p)(ctx.app);
    });
    resolve(ctx);
  });
}

// launch ---------------------------------------------------------------------

var ctx = {
  app: null,
  CFG: {
    DB_URL: config.get('TEST') ? config.get('TEST_DATABASE.URL') : config.get('DB_URL'),
    PORT: config.get('PORT'),
    SESSION: config.get('SESSION')
  }
};

loadConfiguration(ctx)
  .then(createApplication)
  .then(connectToDatabase)
  .then(createShutdownHandlers)
  .then(loadApplicationModules)
  .then(handleCorsRequest)
  .then(startApplication)
  .catch(function (err) {
    pino.error(err);
    process.exit(1);
  });
