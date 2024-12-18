const CustomError = require("../utils/CustomError");
const User = require("../models/user.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
module.exports.currentUser = (req, res, next) => {
  res.status(200).json({ user: req.user });
};
module.exports.login = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    // check if user exists
    const ExistingUser = await User.findOne({ email });
    if (!ExistingUser) return next(new CustomError("User not found", 404));
    const user = await User.authenticate(email, password);
    // generate auth token
    const token = user.generateAuthToken();
    // cookie me set krna h token  ko
    res.cookie("token", token, { expiresIn: "1d" });
    // response -> message and token
    res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    next(new CustomError(error.message, 500));
  }
};
module.exports.signup = async (req, res, next) => {
  const { username, email, password } = req.body;
  try {
    // check if user already exists
    const userExists = await User.findOne({ username, email });
    if (userExists) return next(new CustomError("User already exists", 400));

    //create a user
    const newUser = new User({ username, email, password });
    await newUser.save();

    // generate auth token
    const token = newUser.generateAuthToken();
    // response -> message and token
    res.cookie("token", token, { expiresIn: "1d" });
    // cookie me set krna h token  ko
    res.status(201).json({ message: "User created successfully", token });
  } catch (error) {
    next(new CustomError(error.message, 500));
  }
};
module.exports.logout = async (req, res, next) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
    });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    next(new CustomError("Logout Failed", 500));
  }
};
module.exports.updateprofile = async (req, res, next) => {
  const { username, email, password } = req.body;
  try {
    if (username) req.user.username = username;
    if (email) req.user.email = email;
    if (password) req.user.password = await bcrypt.hash(password, 10);

    await req.user.save();
    res
      .status(200)
      .json({ message: "Profile updated successfully", user: req.user });
  } catch (error) {
    next(new CustomError(error.message, 500));
  }
};
module.exports.resetPassword = async (req, res, next) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return next(new CustomError("User not found", 404));

    const resetToken = jwt.sign({ id: this._id }, process.env.JWT_SECRET_KEY, {
      expiresIn: "1h",
    });

    const resetLink = `http://localhost:5713/reset-password/${resetToken}`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.NODEMAILER_MAIL,
        pass: process.env.NODEMAILER_APP_PASSWORD,
      },
    });

    const mailOption = {
        from: process.env.NODEMAILER_MAIL,
        to:email,
        subject:"Password Reset Request",
        text:`Click on the link to reset your password ${resetLink}`
    }

    await transporter.sendMail(mailOption);

    res.json({message:"Password reset link sent to your email"})

  } catch (error) {
    next(new CustomError(error.message, 500));
  }
};
