const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  require: ['ts-node/register', './test/hooks.ts', 'hardhat/register'],
  extension: ['.ts'],
  ignore: ['./test/utils/**'],
  recursive: true,
  timeout: process.env.MOCHA_TIMEOUT || 300000,
};
