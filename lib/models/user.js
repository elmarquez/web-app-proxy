const bcrypt = require('bcrypt');
const config = require('config');
const mongoose = require('mongoose');
const Promise = require('bluebird');
const randomString = require('randomstring');
const utils = require('../utils/index');
const uuid = require('uuid/v4');
const zxcvbn = require('zxcvbn');

const WORK_FACTOR = config.get('PASSWORD.WORK_FACTOR');

const userSchema = mongoose.Schema({
  uuid: {type: String, required: true},
  biography: {type: String, default: ''},
  email: {type: String, required: true, unique: true},
  password: {type: String, required: true},
  title: {type: String},
  fullname: {type: String},
  userType: {type: String},
  location: {type: String},
  organization: {type: String},
  recoveryToken: {type: String, unique: true, sparse: true},
  recoveryTokenExpires: {type: String},
  signupToken: {type: String, unique: true, sparse: true},
  signupTokenExpires: {type: String},
  verified: {type: Boolean, default: false, required: true},
  cohort: {type: String, default: ''},
  roles: [{type: String}],
  active: {type: Boolean, default: true}
});

/**
 * Determine if the password string matches the user password.
 * @param {String} password Password
 * @param {Function} cb Callback function
 */
userSchema.methods.isPasswordMatch = function (password, cb) {
  bcrypt.compare(password, this.password, function (err, isMatch) {
    if (err) {
      return cb(err);
    } else {
      cb(null, isMatch);
    }
  });
};

/**
 * Set cohort token.
 */
userSchema.methods.setCohortToken = function () {
  let d = new Date();
  d.setHours(0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  this.cohort = Math.ceil((((d - new Date(d.getFullYear(), 0, 1)) / 8.64e7) + 1) / 7);
};

/**
 * Set the user password.
 * @param {String} password Password
 */
userSchema.methods.setPassword = function (password) {
  let self = this;
  return new Promise(function (resolve, reject) {
    bcrypt.genSalt(WORK_FACTOR, function (err, salt) {
      if (err) {
        reject(err);
      } else {
        bcrypt.hash(password, salt, function (err, hash) {
          if (err) {
            reject(err);
          } else {
            self.password = hash;
            resolve(hash);
          }
        });
      }
    });
  });
};

/**
 * Update signup token.
 */
userSchema.methods.setSignupToken = function () {
  this.signupToken = randomString.generate(8);
  this.signupTokenExpires = new Date().toISOString();
};

/**
 * Update UUID field.
 */
userSchema.methods.setUUID = function () {
  this.uuid = uuid();
};

/**
 * Update recovery token.
 */
userSchema.methods.updateRecoveryToken = function () {
  this.recoveryToken = randomString.generate(8);
  let nextYear = utils.getFutureDate(1);
  this.recoveryTokenExpires = nextYear.toISOString();
};

/**
 * Determine if the password meets minimum strength criteria.
 * @param {String} password Password
 * @returns {Boolean}
 */
userSchema.statics.isValidPassword = function (password) {
  return zxcvbn(password);
};

module.exports = mongoose.model('User', userSchema);
