var config = require('config');

const DISABLE_AUTH = config.get('DISABLE_AUTH') === 'true' || config.get('DISABLE_AUTH') === '1';

/**
 * Ensure the client is authenticated. Redirect the client to the login page
 * if they are not authenticated.
 * @param req
 * @param res
 * @param next
 */
function ensureIsAuthenticated (req, res, next) {
  if (DISABLE_AUTH) {
    next();
  } else if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.redirect('/login');
  } else {
    next();
  }
}

module.exports = {
  ensureIsAuthenticated: ensureIsAuthenticated
};
