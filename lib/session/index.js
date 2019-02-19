const passport = require('passport');
const User = require('../models/user');

const LOGIN_ERROR = {
  ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',
  LOGIN_ERROR: 'LOGIN_ERROR',
  NOT_VERIFIED: 'NOT_VERIFIED',
  PARAMETERS_MISSING: 'PARAMETERS_MISSING',
  PASSWORD_ERROR: 'PASSWORD_ERROR',
  PASSWORD_INCORRECT: 'PASSWORD_INCORRECT',
  QUERY_ERROR: 'QUERY_ERROR'
};

/**
 * Deserialize the user record.
 * @param {String} userInfo Email
 * @param {Function} done Callback
 */
function deserializeUser (userInfo, done) {
  done(null, userInfo);
}

/**
 * Get the login view.
 * @param {Request} req Request
 * @param {Response} res Response
 */
function getLoginView (req, res) {
  if (req.isAuthenticated()) {
    res.redirect('/');
  } else {
    res.render('login', {csrfToken: req.csrfToken(), title: 'Title'});
  }
}

/**
 * Get session status.
 * @param {Request} req Request
 * @param {Response} res Response
 */
function getSessionStatus (req, res) {
  res.send({authenticated: req.isAuthenticated()});
}

/**
 * Authenticate user.
 * @param {Request} req Request
 * @param {Response} res Response
 */
function handleLogin (req, res) {
  if (!req.body.email || !req.body.password) {
    handleLoginFailure(req, res, LOGIN_ERROR.PARAMETERS_MISSING);
  } else {
    User.findOne({email: req.body.email}, function (err, user) {
      if (err) {
        handleLoginFailure(req, res, LOGIN_ERROR.QUERY_ERROR, err);
      } else if (!user) {
        handleLoginFailure(req, res, LOGIN_ERROR.ACCOUNT_NOT_FOUND);
      } else {
        user.isPasswordMatch(req.body.password, function (err, isMatch) {
          if (err) {
            handleLoginFailure(req, res, LOGIN_ERROR.PASSWORD_ERROR, err);
          } else if (!isMatch) {
            handleLoginFailure(req, res, LOGIN_ERROR.PASSWORD_INCORRECT);
          } else if (!user.verified) {
            handleLoginFailure(req, res, LOGIN_ERROR.NOT_VERIFIED);
          } else {
            let userInfo = {
              uuid: user.uuid,
              roles: user.roles,
              email: user.email,
              fullname: user.fullname
            };
            req.login(userInfo, function (err) {
              if (err) {
                handleLoginFailure(req, res, LOGIN_ERROR.LOGIN_ERROR, err);
              } else {
                req.log.info('Authenticated', req.body.email);
                res.redirect('/');
              }
            });
          }
        });
      }
    });
  }
}

/**
 * Handle login errors
 * @param {Request} req Request
 * @param {Response} res Response
 * @param {String} loginError
 * @param {Object} err
 */
function handleLoginFailure (req, res, loginError, err=null) {
  switch (loginError) {
    case LOGIN_ERROR.ACCOUNT_NOT_FOUND:
      req.log.warn('Authentication failed', 'account not found', req.body.email);
      res.status(403).redirect('/login');
      break;
    case LOGIN_ERROR.LOGIN_ERROR:
      req.log.error('Authentication failed', 'login error', err);
      res.status(500).redirect('/login');
      break;
    case LOGIN_ERROR.NOT_VERIFIED:
      req.log.error('User is not verified', err);
      res.status(403).redirect('/login');
      break;
    case LOGIN_ERROR.QUERY_ERROR:
      req.log.error('Authentication failed', err);
      res.status(500).redirect('/login');
      break;
    case LOGIN_ERROR.PASSWORD_ERROR:
      req.log.error('Authentication failed', err);
      res.status(500).redirect('/login');
      break;
    case LOGIN_ERROR.PARAMETERS_MISSING:
      req.log.warn('Authentication failed', 'required parameters missing', req.body.email);
      res.status(400).redirect('/login');
      break;
    case LOGIN_ERROR.PASSWORD_INCORRECT:
      req.log.warn('Authentication failed', 'passwords do not match', req.body.email);
      res.status(403).redirect('/login');
      break;
  }
}

/**
 * End the user session.
 * @param {Request} req Request
 * @param {Response} res Response
 */
function handleLogout (req, res) {
  req.logout();
  res.redirect('/');
}

/**
 * Determine if the request is part of an authenticated session.
 * @param {Request} req Request
 * @param {Response} res Response
 * @param {Function} next Next middleware function
 */
function isAuthenticated (req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.redirect('/login');
  }
}

/**
 * Serialize the user record.
 * @param {String} email Email
 * @param {Function} done Callback
 */
function serializeUser (userInfo, done) {
  done(null, userInfo);
}

// add passport account handlers
passport.serializeUser(serializeUser);
passport.deserializeUser(deserializeUser);

module.exports = {
  getLoginView: getLoginView,
  getSessionStatus: getSessionStatus,
  handleLogin: handleLogin,
  handleLogout: handleLogout,
  isAuthenticated: isAuthenticated
};
