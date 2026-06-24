const express = require('express');
const router = express.Router();
const { listProducts, getProduct, getCategories } = require('../controllers/productController');

router.get('/categories', getCategories);
router.get('/', listProducts);
router.get('/:id', getProduct);

module.exports = router;
