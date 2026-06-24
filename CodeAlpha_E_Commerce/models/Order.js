const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Order = sequelize.define('Order', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.STRING, defaultValue: 'pending' },
  totalPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  shippingAddressJson: { type: DataTypes.TEXT, allowNull: false,
    get() { try { return JSON.parse(this.getDataValue('shippingAddressJson') || '{}'); } catch { return {}; } },
    set(v) { this.setDataValue('shippingAddressJson', JSON.stringify(v)); } },
}, { tableName: 'orders', timestamps: true });

module.exports = Order;
