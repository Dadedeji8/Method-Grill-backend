const mongoose = require("mongoose");

const MenuSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Menu item name is required"],
        unique: true,
        trim: true,
        minlength: [2, "Name must be at least 2 characters long"],
        maxlength: [100, "Name cannot exceed 100 characters"]
    },
    price: {
        type: Number,
        required: [true, "Price is required"],
        min: [0, "Price cannot be negative"],
        validate: {
            validator: function (value) {
                return !isNaN(value) && value >= 0;
            },
            message: "Price must be a valid positive number"
        }
    },
    images: {
        type: [String],
        validate: {
            validator: function (array) {
                return array.every(url => typeof url === 'string' && url.trim().length > 0);
            },
            message: "All image URLs must be valid strings"
        }
    },
    ingredients: {
        type: String,
        trim: true,
        maxlength: [500, "Ingredients description cannot exceed 500 characters"]
    },
    featuredImage: { // Fixed capitalization
        type: String,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: [1000, "Description cannot exceed 1000 characters"]
    },
    category: {
        type: String,
        required: [true, "Category is required"],
        trim: true,
        lowercase: true,
        enum: {
            values: ["SOUPS & SWALLOW", "APPETIZERS", "DESSERT", "BEVERAGE", "LIGHT FOOD OPTIONS", "BREAKFAST MENU", "PEPPERSOUP CORNER", "SPECIAL"],
            message: "Category must be one of: SOUPS & SWALLOW, APPETIZERS, DESSERT, BEVERAGE, LIGHT FOOD OPTIONS, BREAKFAST MENU, PEPPERSOUP CORNER ,SPECIAL"
        }
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    preparationTime: {
        type: Number, // in minutes
        min: [1, "Preparation time must be at least 1 minute"],
        max: [180, "Preparation time cannot exceed 3 hours"]
    },
    nutritionalInfo: {
        calories: { type: Number, min: 0 },
        protein: { type: Number, min: 0 },
        carbs: { type: Number, min: 0 },
        fat: { type: Number, min: 0 }
    },
    allergens: [{
        type: String,
        enum: ["gluten", "dairy", "nuts", "eggs", "soy", "shellfish", "fish"]
    }],
    spicyLevel: {
        type: Number,
        min: 0,
        max: 5,
        default: 0
    }
}, {
    timestamps: true // This replaces the manual createdAt field and adds updatedAt
});

// Indexes for better query performance
MenuSchema.index({ category: 1, isAvailable: 1 });
MenuSchema.index({ price: 1 });
MenuSchema.index({ name: "text", description: "text", ingredients: "text" });

module.exports = mongoose.model("Menu", MenuSchema);