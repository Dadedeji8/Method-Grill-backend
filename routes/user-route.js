const Router = require("express").Router();
const { registerUser, createAdmin, login, getProfile } = require("../controllers/user-controller");
const { authMiddleware, authorize } = require("../middlewares/authMiddleware");

// Public routes
Router.route("/register").post(registerUser);
Router.route("/login").post(login);

// Protected routes
Router.route("/profile").get(authMiddleware, getProfile);

// Admin only routes
Router.route("/admin/create").post(authMiddleware, authorize("admin"), createAdmin);

module.exports = Router;