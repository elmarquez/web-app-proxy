#!/usr/bin/env node
const bcrypt = require('bcrypt');
const config = require('config');

var args = process.argv.slice(2);

if (args.length < 1) {
  console.error("Password string is required");
  process.exit(1);
} else {
  bcrypt.genSalt(config.get("PASSWORD.WORK_FACTOR"), function (err, salt) {
    if (err) {
      console.error(err);
      process.exit(1);
    } else {
      bcrypt.hash(args[0], salt, function (err, hash) {
        if (err) {
          console.error(err);
          process.exit(1);
        } else {
          console.info(hash);
        }
      });
    }
  });
}
