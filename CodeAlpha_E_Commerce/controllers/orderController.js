const { Order, OrderItem, CartItem, Product } = require('../models');
const { sequelize } = require('../models');

exports.createOrder = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { shippingAddress } = req.body;
    if (!shippingAddress)
      return res.status(400).json({ error: 'ValidationError', message: 'Shipping address required' });

    const cartItems = await CartItem.findAll({
      where: { userId: req.user.id },
      include: [{ model: Product, as: 'product' }],
    });

    if (!cartItems.length)
      return res.status(400).json({ error: 'EmptyCart', message: 'Cart is empty' });

    let totalPrice = 0;
    const orderItemsData = [];

    for (const ci of cartItems) {
      if (ci.product.stockQuantity < ci.quantity) {
        await t.rollback();
        return res.status(400).json({ error: 'StockError', message: `Insufficient stock for ${ci.product.name}` });
      }
      totalPrice += parseFloat(ci.product.price) * ci.quantity;
      orderItemsData.push({
        productId: ci.productId,
        quantity: ci.quantity,
        unitPriceAtPurchase: ci.product.price,
      });
    }

    const order = await Order.create(
      { userId: req.user.id, totalPrice: totalPrice.toFixed(2), shippingAddressJson: shippingAddress, status: 'pending' },
      { transaction: t }
    );

    for (const itemData of orderItemsData) {
      await OrderItem.create({ ...itemData, orderId: order.id }, { transaction: t });
      await Product.decrement('stockQuantity', { by: itemData.quantity, where: { id: itemData.productId }, transaction: t });
    }

    await CartItem.destroy({ where: { userId: req.user.id }, transaction: t });
    await t.commit();

    const fullOrder = await Order.findByPk(order.id, {
      include: [{ model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] }],
    });

    res.status(201).json({ order: fullOrder });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

exports.getOrders = async (req, res, next) => {
  try {
    const orders = await Order.findAll({
      where: { userId: req.user.id },
      include: [{ model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] }],
      order: [['createdAt', 'DESC']],
    });
    res.json({ orders });
  } catch (err) {
    next(err);
  }
};

exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({
      where: { id: req.params.id, userId: req.user.id },
      include: [{ model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] }],
    });
    if (!order) return res.status(404).json({ error: 'NotFound', message: 'Order not found' });
    res.json({ order });
  } catch (err) {
    next(err);
  }
};
