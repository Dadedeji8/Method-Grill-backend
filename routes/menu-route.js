const {
    getAllMenu,
    getSingleMenuItem,
    editSingleMenuItem,
    deleteSingleMenuItem,
    addItemMenu,
    getMenuCategories,
    getPriceRange
} = require("../controllers/menu-controller");
const { authMiddleware, authorize } = require("../middlewares/authMiddleware");

const route = require("express").Router();

// Public routes
route.get('/', getAllMenu);
route.get('/categories', getMenuCategories);
route.get('/price-range', getPriceRange);
route.get('/:id', getSingleMenuItem);

// Admin only routes
route.post("/", authMiddleware, authorize("admin"), addItemMenu);
route.put('/:id', authMiddleware, authorize("admin"), editSingleMenuItem);
route.delete('/:id', authMiddleware, authorize("admin"), deleteSingleMenuItem);

module.exports = route;