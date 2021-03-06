/**
 * Module dependencies.
 */
const express = require('express');
const compression = require('compression');
const session = require('express-session');
const bodyParser = require('body-parser');
const logger = require('morgan');
const chalk = require('chalk');
const errorHandler = require('errorhandler');
const lusca = require('lusca');
const dotenv = require('dotenv');
const MongoStore = require('connect-mongo')(session);
const flash = require('express-flash');
const path = require('path');
const mongoose = require('mongoose');
const passport = require('passport');
const expressStatusMonitor = require('express-status-monitor');
const sass = require('node-sass-middleware');
const multer = require('multer');
const timeout = require('express-timeout-handler')

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
dotenv.config({ path: '.env' });

/**
 * Base Controllers (route handlers).
 */
const homeController = require('./controllers/home');
const userController = require('./controllers/user');

const contactController = require('./controllers/contact');
/**
 * NRDF Controllers (route handlers)
 */
const tocController = require('./controllers/toc');
const tController = require('./controllers/test');
const trainController = require('./controllers/train');
const scheduleController = require('./controllers/schedule');
const routeController = require('./controllers/route');
const darwinController = require('./controllers/darwin');
//const junctionController = require('./controllers/junction')
//const stationController = require('./controllers/station')


/**
 * Passport configuration.
 */
const passportConfig = require('./config/passport');

/**
 * Create Express server.
 */
const app = express();

/**
 * Connect to MongoDB.
 */
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useNewUrlParser', true);
mongoose.set('useUnifiedTopology', true);
mongoose.set('debug',true)
mongoose.connect(process.env.MONGODB_URI);
mongoose.connection.on('error', (err) => {
    console.error(err);
    console.log('%s MongoDB connection error. Please make sure MongoDB is running.', chalk.red('✗'));
    process.exit();
});

/**
 * Express configuration.
 */
app.set('host', process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0');
app.set('port', process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080);
app.set('views', path.join(__dirname,'views/'));
app.set('view engine', 'pug');
app.use(expressStatusMonitor());
app.use(compression());
app.use(sass({
    src: path.join(__dirname, 'public'),
    dest: path.join(__dirname, 'public')
}));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    resave: true,
    saveUninitialized: true,
    secret: process.env.SESSION_SECRET,
    cookie: { maxAge: 1209600000 }, // two weeks in milliseconds
    store: new MongoStore({
        url: process.env.MONGODB_URI,
        autoReconnect: true,
    })
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
/* app.use((req, res, next) => {
    if (req.path === '/api/upload') {
        // Multer multipart/form-data handling needs to occur before the Lusca CSRF check.
        next();
    } else {
        lusca.csrf()(req, res, next);
    }
}); */
app.use(lusca.xframe('SAMEORIGIN'));
app.use(lusca.xssProtection(true));
app.disable('x-powered-by');
app.use((req, res, next) => {
    res.locals.user = req.user;
    next();
});
app.use((req, res, next) => {
    // After successful login, redirect back to the intended page
    if (!req.user &&
        req.path !== '/login' &&
        req.path !== '/signup' &&
        !req.path.match(/^\/auth/) &&
        !req.path.match(/\./)) {
        req.session.returnTo = req.originalUrl;
    } else if (req.user &&
        (req.path === '/account' || req.path.match(/^\/api/))) {
        req.session.returnTo = req.originalUrl;
    }
    next();
});

app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
    next()
  })
/**
 * Express Timeout Options
 */
var options = {
    timeout: 30000,
    onTimeout: function(req, res) {
      res.status(503).send('Service unavailable. Please retry.');
    },
    onDelayedResponse: function(req, method, args, requestTime) {
      console.log(`Attempted to call ${method} after timeout`);
    },
  };
app.use(timeout.handler(options));
/**
 * Path Alterations
 */
app.use('/', express.static(path.join(__dirname, 'public'), { maxAge: 31557600000 }));
app.use('/js/lib', express.static(path.join(__dirname, 'node_modules/chart.js/dist'), { maxAge: 31557600000 }));
app.use('/js/lib', express.static(path.join(__dirname, 'node_modules/popper.js/dist/umd'), { maxAge: 31557600000 }));
app.use('/js/lib', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js'), { maxAge: 31557600000 }));
app.use('/js/lib', express.static(path.join(__dirname, 'node_modules/jquery/dist'), { maxAge: 31557600000 }));
app.use('/js/lib', express.static(path.join(__dirname, 'node_modules/lightpick'), { maxAge: 31557600000 }));
app.use('/webfonts', express.static(path.join(__dirname, 'node_modules/@fortawesome/fontawesome-free/webfonts'), { maxAge: 31557600000 }));

/**
 * Primary app routes.
 */
app.get('/', homeController.index);
app.get('/login', userController.getLogin);
app.post('/login', userController.postLogin);
app.get('/logout', userController.logout);
app.get('/forgot', userController.getForgot);
app.post('/forgot', userController.postForgot);
app.get('/reset/:token', userController.getReset);
app.post('/reset/:token', userController.postReset);
app.get('/signup', userController.getSignup);
app.post('/signup', userController.postSignup);
app.get('/contact', contactController.getContact);
app.post('/contact', contactController.postContact);
app.get('/account/verify', passportConfig.isAuthenticated, userController.getVerifyEmail);
app.get('/account/verify/:token', passportConfig.isAuthenticated, userController.getVerifyEmailToken);
app.get('/account', passportConfig.isAuthenticated, userController.getAccount);
app.post('/account/profile', passportConfig.isAuthenticated, userController.postUpdateProfile);
app.post('/account/password', passportConfig.isAuthenticated, userController.postUpdatePassword);
app.post('/account/delete', passportConfig.isAuthenticated, userController.postDeleteAccount);
app.get('/account/unlink/:provider', passportConfig.isAuthenticated, userController.getOauthUnlink);

/**
 *  Test Routes
 */
app.get('/t/status',trainController.allActiveTrainstatus)
app.get('/t/trains/r',trainController.rawRandomTrain)
/**
 * My Routes
 */
app.get('/reference/tocs',tocController.getTocs)
app.get('/reference/tocs/:tocID',tocController.getTocByID)

app.get('/live/trains/:trainID',trainController.getLiveTrainByID)

app.get('/live/schedules',scheduleController.getScheduleForm)
app.post('/live/schedules',scheduleController.postScheduleForm)

app.get('/huxley/all/:crs',darwinController.getAll)
app.get('/huxley/delay/:crs',darwinController.getDelay)
app.get('/huxley/service/:serviceID',darwinController.getTrain)
//app.get('/huxley/all/:crs/:no',darwinController.getAll)

/**
 * Pre-Production Routes
 */
app.get('/t/trains/:trainID',trainController.getTrainByID)

app.route('/t/create-route')
    .get(routeController.getCreateRouteForm)
    .post(routeController.postCreateRouteForm)

app.route('/t/routes')
    .get(routeController.getRoute)
    .post(routeController.createRoute)
    .put(routeController.updateAllRoute)
    .delete(routeController.deleteAllRoute)
app.route('/t/routes/:routeID')
    .get(routeController.getRouteById)
    .put(routeController.updateRouteById)
    .delete(routeController.deleteRouteById)
/**
 * Error Handler.
 */
if (process.env.NODE_ENV === 'development') {
    // only use in development
    app.use(errorHandler());
} else {
    app.use((err, req, res, next) => {
        console.error(err);
        res.status(500).send('Server Error');
    });
}

/**
 * Start Express server.
 */
app.listen(app.get('port'), () => {
    console.log('%s App is running at http://localhost:%d in %s mode', chalk.green('✓'), app.get('port'), app.get('env'));
    console.log('  Press CTRL-C to stop\n');
});

process.on('SIGINT', () => { console.log("Bye bye!"); process.exit(); })

module.exports = app;