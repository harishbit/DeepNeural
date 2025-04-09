const User = require('../models/User');
const { generateVerificationCode } = require('../utils/generateCode');
const verificationCodes = new Map();

exports.signup = async (req, res) => {
  // Signup logic from your original code
};

exports.login = async (req, res) => {
  // Login logic
};

exports.logout = (req, res) => {
  // Logout logic
};

exports.getCurrentUser = async (req, res) => {
  // Current user logic
};