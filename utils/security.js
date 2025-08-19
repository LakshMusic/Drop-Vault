const bcrypt = require("bcryptjs");

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

function checkPassword(input, hash) {
  return bcrypt.compareSync(input, hash);
}

module.exports = { hashPassword, checkPassword };
