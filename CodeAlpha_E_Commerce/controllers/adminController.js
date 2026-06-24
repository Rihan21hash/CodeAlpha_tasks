const { Product, Order, OrderItem, User } = require('../models');
const { sequelize } = require('../models');
const path = require('path');
const fs = require('fs');

exports.getDashboardStats = async (req, res, next) => {
  try {
    const totalProducts = await Product.count();
    const totalOrders = await Order.count();
    const totalUsers = await User.count();
    const revenue = await Order.sum('totalPrice', { where: { status: ['confirmed', 'shipped', 'delivered'] } });
    const recentOrders = await Order.findAll({
      limit: 5, order: [['createdAt', 'DESC']],
      include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName', 'email'] }],
    });
    res.json({ totalProducts, totalOrders, totalUsers, revenue: revenue || 0, recentOrders });
  } catch (err) { next(err); }
};

exports.listAllProducts = async (req, res, next) => {
  try {
    const products = await Product.findAll({ order: [['createdAt', 'DESC']] });
    res.json({ products });
  } catch (err) { next(err); }
};

exports.createProduct = async (req, res, next) => {
  try {
    const { name, description, price, stockQuantity, category, sku } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'ValidationError', message: 'Name and price required' });
    let imageUrl = req.body.imageUrl || null;
    if (req.file) imageUrl = `/uploads/${req.file.filename}`;
    const product = await Product.create({ name, description, price, stockQuantity, category, sku, imageUrl });
    res.status(201).json({ product });
  } catch (err) { next(err); }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ error: 'NotFound', message: 'Product not found' });
    let imageUrl = req.body.imageUrl || product.imageUrl;
    if (req.file) imageUrl = `/uploads/${req.file.filename}`;
    await product.update({ ...req.body, imageUrl });
    res.json({ product });
  } catch (err) { next(err); }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ error: 'NotFound', message: 'Product not found' });
    await product.destroy();
    res.json({ message: 'Product deleted' });
  } catch (err) { next(err); }
};

exports.listAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.findAll({
      order: [['createdAt', 'DESC']],
      include: [
        { model: User, as: 'user', attributes: ['firstName', 'lastName', 'email'] },
        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['name'] }] },
      ],
    });
    res.json({ orders });
  } catch (err) { next(err); }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status))
      return res.status(400).json({ error: 'ValidationError', message: 'Invalid status' });
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ error: 'NotFound', message: 'Order not found' });
    await order.update({ status });
    res.json({ order });
  } catch (err) { next(err); }
};
