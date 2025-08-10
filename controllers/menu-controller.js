

const Menu = require("../models/Menu");

const addItemMenu = async (req, res) => {
    try {
        const {
            name,
            price,
            description,
            featuredImage, // Changed from FeaturedImage
            images,
            isAvailable,
            ingredients,
            category,
            preparationTime,
            nutritionalInfo,
            allergens,
            spicyLevel
        } = req.body;

        // Validation
        if (!name || !price || !category) {
            return res.status(400).json({
                success: false,
                message: "Please provide name, price, and category"
            });
        }

        // Fixed price validation
        if (typeof price !== 'number' || price < 0) {
            return res.status(400).json({
                success: false,
                message: "Price must be a positive number"
            });
        }

        // Validate category
        const validCategories = ["SOUPS & SWALLOW", "BREAD LOVERS CORNER", "PEPPERSOUP CORNER", "APPETIZERS", "DESSERT", "BEVERAGE", "LIGHT FOOD OPTIONS", "BREAKFAST MENU", "PEPPERSOUP CORNER", "SPECIAL"];
        if (!validCategories.includes(category)) {
            return res.status(400).json({
                success: false,
                message: `Category must be one of: ${validCategories.join(", ")}`
            });
        }

        const alreadyExists = await Menu.findOne({ name: name.trim() });
        if (alreadyExists) {
            return res.status(409).json({
                success: false,
                message: "Menu item with this name already exists"
            });
        }

        // Create menu item data object
        const menuData = {
            name: name.trim(),
            price,
            description: description?.trim(),
            featuredImage: featuredImage?.trim(),
            images: images || [],
            isAvailable: isAvailable !== undefined ? isAvailable : true,
            ingredients: ingredients?.trim(),
            category: category
        };

        // Add optional fields if provided
        if (preparationTime !== undefined) {
            menuData.preparationTime = preparationTime;
        }
        if (nutritionalInfo) {
            menuData.nutritionalInfo = nutritionalInfo;
        }
        if (allergens && Array.isArray(allergens)) {
            menuData.allergens = allergens;
        }
        if (spicyLevel !== undefined) {
            menuData.spicyLevel = spicyLevel;
        }

        // Create menu item
        const menu = await Menu.create(menuData);

        return res.status(201).json({
            success: true,
            message: "Menu item created successfully",
            data: menu
        });

    } catch (err) {
        console.error("Add menu item error:", err);

        // Handle validation errors
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getAllMenu = async (req, res) => {
    try {
        const {
            q, // Search query
            category,
            isAvailable,
            minPrice,
            maxPrice,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            page = 1,
            limit = 10,
            fields,
            includeMeta = 'false'
        } = req.query;

        // Build base query
        let query = {};

        // Search functionality
        if (q && q.trim() !== '') {
            query.$text = { $search: q.trim() };
        }

        // Category filter
        if (category) {
            query.category = category.toLowerCase().trim();
        }

        // Availability filter
        if (isAvailable !== undefined) {
            query.isAvailable = isAvailable === 'true';
        }

        // Price range filter
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = parseFloat(minPrice);
            if (maxPrice) query.price.$lte = parseFloat(maxPrice);
        }

        // Sorting logic
        let sort = {};
        if (q && q.trim() !== '') {
            // For text search, sort by text score first
            sort = { score: { $meta: "textScore" }, createdAt: -1 };
        } else {
            // Regular sorting
            const validSortFields = ['name', 'price', 'createdAt', 'updatedAt', 'category'];
            const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
            const sortDirection = sortOrder === 'asc' ? 1 : -1;
            sort[sortField] = sortDirection;
        }

        // Pagination
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;

        // Field selection
        let selectFields = '';
        if (fields) {
            const allowedFields = [
                'name', 'price', 'description', 'featuredImage',
                'images', 'isAvailable', 'ingredients', 'category',
                'preparationTime', 'nutritionalInfo', 'allergens', 'spicyLevel',
                'createdAt', 'updatedAt'
            ];
            const requestedFields = fields.split(',')
                .map(field => field.trim())
                .filter(field => allowedFields.includes(field));
            if (requestedFields.length > 0) {
                selectFields = requestedFields.join(' ');
            }
        }

        // Execute main query
        const menuQuery = Menu.find(query)
            .sort(sort)
            .skip(skip)
            .limit(limitNum);

        if (selectFields) {
            menuQuery.select(selectFields);
        }

        // Execute queries in parallel for better performance
        const [menus, totalCount] = await Promise.all([
            menuQuery,
            Menu.countDocuments(query)
        ]);

        const totalPages = Math.ceil(totalCount / limitNum);

        // Prepare response data
        let responseData = {
            success: true,
            data: menus,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalItems: totalCount,
                itemsPerPage: limitNum,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1
            }
        };

        // Add search-specific information if this was a search request
        if (q && q.trim() !== '') {
            responseData.searchInfo = {
                query: q,
                resultsFound: menus.length
            };
        }

        // Add applied filters information
        responseData.filters = {
            category,
            isAvailable,
            minPrice,
            maxPrice,
            sortBy,
            sortOrder
        };

        // Include metadata if requested
        if (includeMeta === 'true') {
            const [categories, priceStats] = await Promise.all([
                Menu.distinct('category'),
                Menu.aggregate([
                    {
                        $group: {
                            _id: null,
                            minPrice: { $min: "$price" },
                            maxPrice: { $max: "$price" },
                            avgPrice: { $avg: "$price" }
                        }
                    }
                ])
            ]);

            const stats = priceStats[0] || { minPrice: 0, maxPrice: 0, avgPrice: 0 };

            responseData.metadata = {
                categories: categories.sort(),
                priceRange: {
                    minPrice: Math.floor(stats.minPrice || 0),
                    maxPrice: Math.ceil(stats.maxPrice || 0),
                    avgPrice: Math.round((stats.avgPrice || 0) * 100) / 100
                }
            };
        }

        return res.status(200).json(responseData);

    } catch (err) {
        console.error("Get all menu error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getMenuCategories = async (req, res) => {
    try {
        const categories = await Menu.distinct('category');

        return res.status(200).json({
            success: true,
            data: categories.sort()
        });
    } catch (err) {
        console.error("Get categories error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getPriceRange = async (req, res) => {
    try {
        const priceStats = await Menu.aggregate([
            {
                $group: {
                    _id: null,
                    minPrice: { $min: "$price" },
                    maxPrice: { $max: "$price" },
                    avgPrice: { $avg: "$price" }
                }
            }
        ]);

        const stats = priceStats[0] || { minPrice: 0, maxPrice: 0, avgPrice: 0 };

        return res.status(200).json({
            success: true,
            data: {
                minPrice: Math.floor(stats.minPrice || 0),
                maxPrice: Math.ceil(stats.maxPrice || 0),
                avgPrice: Math.round((stats.avgPrice || 0) * 100) / 100
            }
        });
    } catch (err) {
        console.error("Get price range error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getSingleMenuItem = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ObjectId
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: "Invalid menu item ID"
            });
        }

        const menu = await Menu.findById(id);

        if (!menu) {
            return res.status(404).json({
                success: false,
                message: "Menu item not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: menu
        });
    } catch (err) {
        console.error("Get single menu item error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const editSingleMenuItem = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Validate ObjectId
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: "Invalid menu item ID"
            });
        }

        // Remove fields that shouldn't be updated manually
        delete updates._id;
        delete updates.createdAt;
        delete updates.updatedAt;

        // Validate price if provided
        if (updates.price !== undefined) {
            if (typeof updates.price !== 'number' || updates.price < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Price must be a positive number"
                });
            }
        }

        // Validate category if provided
        if (updates.category) {
            const validCategories = ["SOUPS & SWALLOW", "BREAD LOVERS CORNER", "PEPPERSOUP CORNER", "APPETIZERS", "DESSERT", "BEVERAGE", "LIGHT FOOD OPTIONS", "BREAKFAST MENU", "PEPPERSOUP CORNER", "SPECIAL"];
            if (!validCategories.includes(updates.category)) {
                return res.status(400).json({
                    success: false,
                    message: `Category must be one of: ${validCategories.join(", ")}`
                });
            }
            updates.category = updates.category;
        }

        // Trim string fields
        if (updates.name) updates.name = updates.name.trim();
        if (updates.description) updates.description = updates.description.trim();
        if (updates.ingredients) updates.ingredients = updates.ingredients;
        if (updates.featuredImage) updates.featuredImage = updates.featuredImage.trim();

        const menu = await Menu.findByIdAndUpdate(
            id,
            updates,
            {
                new: true, // Return updated document
                runValidators: true // Run schema validations
            }
        );

        if (!menu) {
            return res.status(404).json({
                success: false,
                message: "Menu item not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Menu item updated successfully",
            data: menu
        });
    } catch (err) {
        console.error("Edit menu item error:", err);

        // Handle validation errors
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const deleteSingleMenuItem = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ObjectId
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: "Invalid menu item ID"
            });
        }

        const menu = await Menu.findByIdAndDelete(id);

        if (!menu) {
            return res.status(404).json({
                success: false,
                message: "Menu item not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Menu item deleted successfully",
            data: menu
        });
    } catch (err) {
        console.error("Delete menu item error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = {
    getAllMenu,
    getSingleMenuItem,
    editSingleMenuItem,
    deleteSingleMenuItem,
    addItemMenu,
    getMenuCategories,
    getPriceRange
};