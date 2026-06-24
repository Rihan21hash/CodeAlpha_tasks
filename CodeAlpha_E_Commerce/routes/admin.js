const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const {
  getDashboardStats,
  listAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  listAllOrders,
  updateOrderStatus,
} = require('../controllers/adminController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.use(auth, adminOnly);

router.get('/stats', getDashboardStats);
router.get('/products', listAllProducts);
router.post('/products', upload.single('image'), createProduct);
router.patch('/products/:id', upload.single('image'), updateProduct);
router.delete('/products/:id', deleteProduct);
router.get('/orders', listAllOrders);
router.patch('/orders/:id', updateOrderStatus);

module.exports = router;
