

const User = require("../models/User");
const bcrypt = require("bcryptjs"); // Changed from bcrypt to bcryptjs
const jwt = require("jsonwebtoken");

// Input validation helper
const validateInput = (fields) => {
    const errors = [];
    
    for (const [field, value] of Object.entries(fields)) {
        if (!value || (typeof value === 'string' && value.trim() === '')) {
            errors.push(`${field} is required`);
        }
    }
    
    return errors;
};

// Generate JWT token
const generateToken = (user) => {
    return jwt.sign(
        { 
            userId: user._id, 
            email: user.email, 
            role: user.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" } // Changed from 365d to 7d for better security
    );
};

// Register regular user
const registerUser = async (req, res) => {
    try {
        const { name, email, phoneNumber, password } = req.body;

        // Validate input
        const validationErrors = validateInput({ name, email, phoneNumber, password });
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: validationErrors
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ email }, { phoneNumber }]
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: existingUser.email === email 
                    ? "User with this email already exists" 
                    : "User with this phone number already exists"
            });
        }

        // Validate password length
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long"
            });
        }

        // Hash password
        const saltRounds = 12; // Increased from 10 for better security
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create new user
        const newUser = await User.create({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phoneNumber: phoneNumber.trim(),
            password: hashedPassword,
            role: "user"
        });

        // Generate token
        const token = generateToken(newUser);

        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            token,
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                phoneNumber: newUser.phoneNumber,
                role: newUser.role,
                createdAt: newUser.createdAt
            }
        });

    } catch (error) {
        console.error("Registration error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error during registration"
        });
    }
};

// Create admin (should be protected and only accessible by existing admins)
const createAdmin = async (req, res) => {
    try {
        const { name, email, phoneNumber, password } = req.body;

        // Validate input
        const validationErrors = validateInput({ name, email, phoneNumber, password });
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: validationErrors
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ email }, { phoneNumber }]
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: existingUser.email === email 
                    ? "User with this email already exists" 
                    : "User with this phone number already exists"
            });
        }

        // Validate password length
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long"
            });
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create new admin
        const newAdmin = await User.create({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phoneNumber: phoneNumber.trim(),
            password: hashedPassword,
            role: "admin"
        });

        return res.status(201).json({
            success: true,
            message: "Admin created successfully",
            user: {
                id: newAdmin._id,
                name: newAdmin.name,
                email: newAdmin.email,
                phoneNumber: newAdmin.phoneNumber,
                role: newAdmin.role,
                createdAt: newAdmin.createdAt
            }
        });

    } catch (error) {
        console.error("Admin creation error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error during admin creation"
        });
    }
};

// Login user
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        const validationErrors = validateInput({ email, password });
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: validationErrors
            });
        }

        // Find user by email
        const user = await User.findOne({ email: email.trim().toLowerCase() });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: "Account is deactivated. Please contact support."
            });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Update last login
        await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

        // Generate token
        const token = generateToken(user);

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phoneNumber: user.phoneNumber,
                role: user.role,
                lastLogin: new Date()
            }
        });

    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error during login"
        });
    }
};

// Get user profile
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phoneNumber: user.phoneNumber,
                role: user.role,
                isActive: user.isActive,
                lastLogin: user.lastLogin,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            }
        });

    } catch (error) {
        console.error("Get profile error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = { 
    registerUser, 
    createAdmin, 
    login, 
    getProfile 
};