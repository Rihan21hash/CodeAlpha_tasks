const { CartItem, Product } = require('../models');

const getIdentifier = (req) => {
  if (req.user) return { userId: req.user.id };
  return { sessionId: req.sessionID };
};

exports.getCart = async (req, res, next) => {
  try {
    const where = getIdentifier(req);
    const items = await CartItem.findAll({
      where,
      include: [{ model: Product, as: 'product' }],
    });

    const subtotal = items.reduce((sum, i) => sum + parseFloat(i.product.price) * i.quantity, 0);
    res.json({ items, subtotal: subtotal.toFixed(2) });
  } catch (err) {
    next(err);
  }
};

exports.addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;
    if (!productId) return res.status(400).json({ error: 'ValidationError', message: 'productId required' });

    const product = await Product.findByPk(productId);
    if (!product) return res.status(404).json({ error: 'NotFound', message: 'Product not found' });
    if (product.stockQuantity < quantity)
      return res.status(400).json({ error: 'StockError', message: 'Insufficient stock' });

    const where = { ...getIdentifier(req), productId };
    const [item, created] = await CartItem.findOrCreate({ where, defaults: { quantity } });

    if (!created) {
      item.quantity += parseInt(quantity);
      await item.save();
    }

    res.status(201).json({ item, message: 'Added to cart' });
  } catch (err) {
    next(err);
  }
};

exports.updateCartItem = async (req, res, next) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity < 1)
      return res.status(400).json({ error: 'ValidationError', message: 'Quantity must be >= 1' });

    const item = await CartItem.findByPk(req.params.itemId);
    if (!item) return res.status(404).json({ error: 'NotFound', message: 'Cart item not found' });

    item.quantity = parseInt(quantity);
    await item.save();
    res.json({ item });
  } catch (err) {
    next(err);
  }
};

exports.removeFromCart = async (req, res, next) => {
  try {
    const item = await CartItem.findByPk(req.params.itemId);
    if (!item) return res.status(404).json({ error: 'NotFound', message: 'Cart item not found' });
    await item.destroy();
    res.json({ message: 'Item removed' });
  } catch (err) {
    next(err);
  }
};

exports.clearCart = async (req, res, next) => {
  try {
    const where = getIdentifier(req);
    await CartItem.destroy({ where });
    res.json({ message: 'Cart cleared' });
  } catch (err) {
    next(err);
  }
};

exports.mergeCart = async (sessionId, userId) => {
  const sessionItems = await CartItem.findAll({ where: { sessionId } });
  for (const si of sessionItems) {
    const [item, created] = await CartItem.findOrCreate({
      where: { userId, productId: si.productId },
      defaults: { quantity: si.quantity },
    });
    if (!created) {
      item.quantity += si.quantity;
      await item.save();
    }
    await si.destroy();
  }
};
