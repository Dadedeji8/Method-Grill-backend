const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require('dotenv').config();

// Import routes
const menuRoute = require("./routes/menu-route");
const authRoute = require("./routes/user-route");

// Import middleware
const { rateLimit, validateRequest } = require("./middlewares/authMiddleware");

const app = express();

// Environment validation
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
    console.error('Missing required environment variables:', missingEnvVars.join(', '));
    console.error('Please check your .env file');
    process.exit(1);
}

// Security middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || "*", // Configure this properly in production
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
app.use(rateLimit(100, 15 * 60 * 1000)); // 100 requests per 15 minutes

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request validation
app.use(validateRequest);

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// API routes
app.use("/api/v1/menu", menuRoute);
app.use("/api/v1/auth", authRoute);

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.originalUrl
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    
    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(err.status || 500).json({
        success: false,
        message: isDevelopment ? err.message : 'Internal server error',
        ...(isDevelopment && { stack: err.stack })
    });
});

const port = process.env.PORT || 3000;

// MongoDB connection with caching for serverless
let cachedConnection = null;

const connectToDatabase = async () => {
    if (cachedConnection) {
        return cachedConnection;
    }

    try {
        const connection = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        
        cachedConnection = connection;
        console.log("✅ Connected to database successfully");
        return connection;
    } catch (error) {
        console.error("❌ Failed to connect to database:", error.message);
        throw error;
    }
};

const createServer = async () => {
    try {
        // Connect to MongoDB
        await connectToDatabase();
        
        // Start server (only if not in Vercel environment)
        if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
            const server = app.listen(port, () => {
                console.log(`🚀 Server running on port ${port}`);
                console.log(`📍 Health check: http://localhost:${port}/health`);
                console.log(`🔗 API Base URL: http://localhost:${port}/api/v1`);
            });

            // Graceful shutdown
            process.on('SIGTERM', async () => {
                console.log('SIGTERM received, shutting down gracefully');
                server.close(() => {
                    mongoose.connection.close();
                    process.exit(0);
                });
            });

            process.on('SIGINT', async () => {
                console.log('SIGINT received, shutting down gracefully');
                server.close(() => {
                    mongoose.connection.close();
                    process.exit(0);
                });
            });
        }

    } catch (error) {
        console.error("❌ Failed to start server:", error.message);
        if (process.env.NODE_ENV !== 'production') {
            process.exit(1);
        }
    }
};

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
    process.exit(1);
});

// Initialize the server
createServer();

// Export the Express app for Vercel
module.exports = app;