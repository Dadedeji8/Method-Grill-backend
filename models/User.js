const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Name is required"],
        trim: true,
        minlength: [2, "Name must be at least 2 characters long"],
        maxlength: [50, "Name cannot exceed 50 characters"]
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email"]
    },
    phoneNumber: {
        type: String,
        required: [true, "Phone number is required"],
        unique: true,
        trim: true,
        match: [/^[\+]?[1-9][\d]{0,15}$/, "Please enter a valid phone number"]
    },
    role: {
        type: String,
        enum: {
            values: ["admin", "user"],
            message: "Role must be either admin or user"
        },
        default: "user"
        // Removed unique: true - this was preventing multiple users with same role
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        minlength: [6, "Password must be at least 6 characters long"]
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date
    }
}, {
    timestamps: true // This replaces the manual date field and adds createdAt/updatedAt
});

// Index for better query performance
UserSchema.index({ email: 1 });
UserSchema.index({ phoneNumber: 1 });

// Remove password from JSON output
UserSchema.methods.toJSON = function() {
    const userObject = this.toObject();
    delete userObject.password;
    return userObject;
};

module.exports = mongoose.model("User", UserSchema);