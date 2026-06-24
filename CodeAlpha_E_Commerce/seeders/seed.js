require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, User, Product, Order, OrderItem, CartItem } = require('../models');

const products = [
  // Electronics
  { name: 'ProSound Wireless Headphones', description: 'Premium noise-cancelling headphones with 40hr battery life, Hi-Res Audio certified, and ultra-soft memory foam ear cushions.', price: 129.99, stockQuantity: 45, category: 'Electronics', sku: 'ELEC-001', imageUrl: '/img/headphones.jpg', rating: 4.8, reviewCount: 342 },
  { name: 'UltraView 4K Monitor', description: '27-inch IPS panel with 144Hz refresh rate, HDR400, and USB-C 65W power delivery. Perfect for professionals and gamers.', price: 399.99, stockQuantity: 20, category: 'Electronics', sku: 'ELEC-002', imageUrl: '/img/moniter.jpg', rating: 4.7, reviewCount: 218 },
  { name: 'SwiftCharge Power Bank', description: '26800mAh high-capacity power bank with 65W PD fast charging. Powers up to 3 devices simultaneously.', price: 59.99, stockQuantity: 80, category: 'Electronics', sku: 'ELEC-003', imageUrl: '/img/PowerBank.jpg', rating: 4.5, reviewCount: 156 },
  { name: 'MechaKeys RGB Keyboard', description: 'Tactile mechanical gaming keyboard with Cherry MX switches, per-key RGB, and aircraft-grade aluminium frame.', price: 89.99, stockQuantity: 35, category: 'Electronics', sku: 'ELEC-004', imageUrl: '/img/Keyboard.jpg', rating: 4.6, reviewCount: 287 },
  // Clothing
  { name: 'Urban Flex Hoodie', description: 'Ultra-soft premium cotton-blend hoodie with kangaroo pocket and adjustable drawstring. Available in 8 colors.', price: 49.99, stockQuantity: 120, category: 'Clothing', sku: 'CLO-001', imageUrl: '/img/Hoodie.jpg', rating: 4.4, reviewCount: 523 },
  { name: 'AeroRun Performance Tee', description: 'Moisture-wicking athletic t-shirt with 4-way stretch fabric. Ideal for gym, running, and outdoor activities.', price: 29.99, stockQuantity: 200, category: 'Clothing', sku: 'CLO-002', imageUrl: '/img/PerformanceTee.jpg', rating: 4.3, reviewCount: 412 },
  { name: 'SlimFit Chinos', description: 'Modern slim-fit chino trousers in premium stretch cotton. Wrinkle-resistant and perfect from office to weekend.', price: 64.99, stockQuantity: 90, category: 'Clothing', sku: 'CLO-003', imageUrl: '/img/Chinos.jpg', rating: 4.5, reviewCount: 198 },
  { name: 'LuxeLeather Sneakers', description: 'Handcrafted genuine leather sneakers with memory foam insoles. Clean minimalist design that pairs with any outfit.', price: 119.99, stockQuantity: 55, category: 'Clothing', sku: 'CLO-004', imageUrl: '/img/Sneakers.jpg', rating: 4.7, reviewCount: 334 },
  // Home & Garden
  { name: 'BrewMaster Pour-Over Set', description: 'Complete hand-drip coffee set: borosilicate glass dripper, precision kettle, and 100 natural paper filters.', price: 44.99, stockQuantity: 65, category: 'Home & Garden', sku: 'HOME-001', imageUrl: '/img/PourOverSet.jpg', rating: 4.9, reviewCount: 267 },
  { name: 'SmartGrow Planter', description: 'Self-watering ceramic planter with moisture sensor. Perfect for herbs, succulents and indoor plants.', price: 34.99, stockQuantity: 100, category: 'Home & Garden', sku: 'HOME-002', imageUrl: '/img/Planter.jpg', rating: 4.4, reviewCount: 143 },
  { name: 'AromaLux Diffuser', description: 'Ultrasonic essential oil diffuser with 7-color LED mood lighting, 400ml tank, and whisper-quiet operation.', price: 39.99, stockQuantity: 75, category: 'Home & Garden', sku: 'HOME-003', imageUrl: '/img/Diffuser.jpg', rating: 4.6, reviewCount: 389 },
  { name: 'Nordic Throw Blanket', description: 'Chunky knit throw blanket in 100% organic Merino wool. Oversized 150×200cm — cozy, warm and beautifully textured.', price: 79.99, stockQuantity: 40, category: 'Home & Garden', sku: 'HOME-004', imageUrl: '/img/ThrowBlanket.jpg', rating: 4.8, reviewCount: 211 },
];

const seed = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database');
    await sequelize.sync({ force: true });
    console.log('✅ Tables created');

    // Create admin user
    const adminHash = await bcrypt.hash('admin123', 12);
    const admin = await User.create({
      email: 'admin@shop.com',
      passwordHash: adminHash,
      firstName: 'Admin',
      lastName: 'User',
      isAdmin: true,
    });
    console.log('✅ Admin user created: admin@shop.com / admin123');

    // Create demo user
    const userHash = await bcrypt.hash('user123', 12);
    const demoUser = await User.create({
      email: 'demo@shop.com',
      passwordHash: userHash,
      firstName: 'Jane',
      lastName: 'Doe',
      isAdmin: false,
    });
    console.log('✅ Demo user created: demo@shop.com / user123');

    // Seed products
    await Product.bulkCreate(products);
    console.log(`✅ ${products.length} products seeded`);

    // Create a sample order for demo user
    const allProducts = await Product.findAll();
    const sampleOrder = await Order.create({
      userId: demoUser.id,
      status: 'delivered',
      totalPrice: 179.98,
      shippingAddressJson: {
        fullName: 'Jane Doe',
        address: '123 Main Street',
        city: 'New York',
        state: 'NY',
        zip: '10001',
        country: 'US',
      },
    });
    await OrderItem.create({ orderId: sampleOrder.id, productId: allProducts[0].id, quantity: 1, unitPriceAtPurchase: allProducts[0].price });
    await OrderItem.create({ orderId: sampleOrder.id, productId: allProducts[4].id, quantity: 1, unitPriceAtPurchase: allProducts[4].price });
    console.log('✅ Sample order created for demo user');

    console.log('\n🎉 Database seeded successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Admin login → admin@shop.com / admin123');
    console.log('Demo  login → demo@shop.com  / user123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
};

seed();
