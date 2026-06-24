const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Product = sequelize.define('Product', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  stockQuantity: { type: DataTypes.INTEGER, defaultValue: 0 },
  category: { type: DataTypes.STRING },
  imageUrl: { type: DataTypes.STRING },
  sku: { type: DataTypes.STRING, unique: true },
  rating: { type: DataTypes.DECIMAL(3, 2), defaultValue: 4.0 },
  reviewCount: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'products', timestamps: true });

module.exports = Product;
