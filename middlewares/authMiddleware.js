const jwt = require("jsonwebtoken");

// Simple in-memory rate limiter (for production, use Redis)
const rateLimiter = new Map();

// Rate limiting middleware
const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
    return (req, res, next) => {
        const clientIP = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        const windowStart = now - windowMs;

        // Clean old entries
        if (rateLimiter.has(clientIP)) {
            const requests = rateLimiter.get(clientIP).filter(time => time > windowStart);
            rateLimiter.set(clientIP, requests);
        }

        // Get current requests
        const currentRequests = rateLimiter.get(clientIP) || [];

        if (currentRequests.length >= maxRequests) {
            return res.status(429).json({
                success: false,
                message: "Too many requests. Please try again later.",
                retryAfter: Math.ceil(windowMs / 1000)
            });
        }

        // Add current request
        currentRequests.push(now);
        rateLimiter.set(clientIP, currentRequests);

        next();
    };
};

// Request validation middleware
const validateRequest = (req, res, next) => {
    // Check Content-Type for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        if (!req.is('application/json')) {
            return res.status(400).json({
                success: false,
                message: "Content-Type must be application/json"
            });
        }
    }

    // Basic request size validation (Express already handles this, but good to be explicit)
    if (req.method === 'POST' && req.body && JSON.stringify(req.body).length > 1024 * 1024) {
        return res.status(413).json({
            success: false,
            message: "Request body too large"
        });
    }

    next();
};

// Authentication middleware - verifies JWT token
const authMiddleware = async (req, res, next) => {
    try {
        // Get the token from the request header
        const authHeader = req.header("Authorization");

        // If no token is provided, return a 401 status code with a message
        if (!authHeader) {
            return res.status(401).json({ 
                success: false,
                message: "Access denied. No token provided" 
            });
        }

        // Extract token from "Bearer <token>" format
        const token = authHeader.startsWith("Bearer ")
            ? authHeader.slice(7)
            : authHeader;

        // Check if JWT_SECRET is available
        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET environment variable is not set");
            return res.status(500).json({ 
                success: false,
                message: "Internal Server Error" 
            });
        }

        // Verify the token using the secret key
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // If the token is valid, add the decoded user to the request object
        req.user = decoded;

        // Call the next middleware function
        next();

    } catch (err) {
        // Handle different types of JWT errors
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false,
                message: "Token expired. Please login again." 
            });
        } else if (err.name === 'JsonWebTokenError') {
            return res.status(403).json({ 
                success: false,
                message: "Invalid token" 
            });
        } else if (err.name === 'NotBeforeError') {
            return res.status(403).json({ 
                success: false,
                message: "Token not active yet" 
            });
        } else {
            console.error("Auth middleware error:", err);
            return res.status(500).json({ 
                success: false,
                message: "Internal Server Error" 
            });
        }
    }
};

// Authorization middleware - checks user roles
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Access denied. Please authenticate first."
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied. Insufficient permissions."
            });
        }

        next();
    };
};

module.exports = { 
    authMiddleware, 
    authorize, 
    rateLimit, 
    validateRequest 
};