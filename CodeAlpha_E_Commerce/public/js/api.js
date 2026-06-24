// ═══════════════════════════════════════════
// API MODULE — Dual-Mode (Server + Mock) with Path Resolver
// ═══════════════════════════════════════════

const API_BASE = '/api';

// 1. Path Resolver Helper
window.getAppPath = function(path) {
  const pathname = window.location.pathname;
  let basePath = '/';
  
  if (pathname.includes('/public/')) {
    basePath = pathname.substring(0, pathname.indexOf('/public/') + 8);
  } else if (window.location.hostname.endsWith('github.io')) {
    const segments = pathname.split('/');
    if (segments.length > 1 && segments[1]) {
      basePath = `/${segments[1]}/`;
    }
  }
  
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  if (window.location.protocol === 'file:') {
    return `file://${basePath}${cleanPath}`;
  }
  const origin = window.location.origin === 'null' ? '' : window.location.origin;
  return `${origin}${basePath}${cleanPath}`;
};

// 2. Dual Mode Decision
const IS_SERVER_HOST = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const useMock = !IS_SERVER_HOST || localStorage.getItem('useMockApi') === 'true';

if (useMock) {
  console.log('🤖 NexShop running in client-side Mock API mode (using localStorage)');
} else {
  console.log('🌐 NexShop running in Server Mode (connecting to Express backend)');
}

function getToken() {
  return localStorage.getItem('token');
}

// 3. Mock Database System
function getMockProductImageUrl(filename) {
  // img/ folder is inside public/, so a simple relative path works on all hosts
  return 'img/' + filename;
}

const MOCK_PRODUCTS = [
  // Electronics
  { id: 1, name: 'ProSound Wireless Headphones', description: 'Premium noise-cancelling headphones with 40hr battery life, Hi-Res Audio certified, and ultra-soft memory foam ear cushions.', price: 129.99, stockQuantity: 45, category: 'Electronics', sku: 'ELEC-001', imageUrl: getMockProductImageUrl('headphones.jpg'), rating: 4.8, reviewCount: 342, createdAt: new Date().toISOString() },
  { id: 2, name: 'UltraView 4K Monitor', description: '27-inch IPS panel with 144Hz refresh rate, HDR400, and USB-C 65W power delivery. Perfect for professionals and gamers.', price: 399.99, stockQuantity: 20, category: 'Electronics', sku: 'ELEC-002', imageUrl: getMockProductImageUrl('moniter.jpg'), rating: 4.7, reviewCount: 218, createdAt: new Date().toISOString() },
  { id: 3, name: 'SwiftCharge Power Bank', description: '26800mAh high-capacity power bank with 65W PD fast charging. Powers up to 3 devices simultaneously.', price: 59.99, stockQuantity: 80, category: 'Electronics', sku: 'ELEC-003', imageUrl: getMockProductImageUrl('PowerBank.jpg'), rating: 4.5, reviewCount: 156, createdAt: new Date().toISOString() },
  { id: 4, name: 'MechaKeys RGB Keyboard', description: 'Tactile mechanical gaming keyboard with Cherry MX switches, per-key RGB, and aircraft-grade aluminium frame.', price: 89.99, stockQuantity: 35, category: 'Electronics', sku: 'ELEC-004', imageUrl: getMockProductImageUrl('Keyboard.jpg'), rating: 4.6, reviewCount: 287, createdAt: new Date().toISOString() },
  // Clothing
  { id: 5, name: 'Urban Flex Hoodie', description: 'Ultra-soft premium cotton-blend hoodie with kangaroo pocket and adjustable drawstring. Available in 8 colors.', price: 49.99, stockQuantity: 120, category: 'Clothing', sku: 'CLO-001', imageUrl: getMockProductImageUrl('Hoodie.jpg'), rating: 4.4, reviewCount: 523, createdAt: new Date().toISOString() },
  { id: 6, name: 'AeroRun Performance Tee', description: 'Moisture-wicking athletic t-shirt with 4-way stretch fabric. Ideal for gym, running, and outdoor activities.', price: 29.99, stockQuantity: 200, category: 'Clothing', sku: 'CLO-002', imageUrl: getMockProductImageUrl('PerformanceTee.jpg'), rating: 4.3, reviewCount: 412, createdAt: new Date().toISOString() },
  { id: 7, name: 'SlimFit Chinos', description: 'Modern slim-fit chino trousers in premium stretch cotton. Wrinkle-resistant and perfect from office to weekend.', price: 64.99, stockQuantity: 90, category: 'Clothing', sku: 'CLO-003', imageUrl: getMockProductImageUrl('Chinos.jpg'), rating: 4.5, reviewCount: 198, createdAt: new Date().toISOString() },
  { id: 8, name: 'LuxeLeather Sneakers', description: 'Handcrafted genuine leather sneakers with memory foam insoles. Clean minimalist design that pairs with any outfit.', price: 119.99, stockQuantity: 55, category: 'Clothing', sku: 'CLO-004', imageUrl: getMockProductImageUrl('Sneakers.jpg'), rating: 4.7, reviewCount: 334, createdAt: new Date().toISOString() },
  // Home & Garden
  { id: 9, name: 'BrewMaster Pour-Over Set', description: 'Complete hand-drip coffee set: borosilicate glass dripper, precision kettle, and 100 natural paper filters.', price: 44.99, stockQuantity: 65, category: 'Home & Garden', sku: 'HOME-001', imageUrl: getMockProductImageUrl('PourOverSet.jpg'), rating: 4.9, reviewCount: 267, createdAt: new Date().toISOString() },
  { id: 10, name: 'SmartGrow Planter', description: 'Self-watering ceramic planter with moisture sensor. Perfect for herbs, succulents and indoor plants.', price: 34.99, stockQuantity: 100, category: 'Home & Garden', sku: 'HOME-002', imageUrl: getMockProductImageUrl('Planter.jpg'), rating: 4.4, reviewCount: 143, createdAt: new Date().toISOString() },
  { id: 11, name: 'AromaLux Diffuser', description: 'Ultrasonic essential oil diffuser with 7-color LED mood lighting, 400ml tank, and whisper-quiet operation.', price: 39.99, stockQuantity: 75, category: 'Home & Garden', sku: 'HOME-003', imageUrl: getMockProductImageUrl('Diffuser.jpg'), rating: 4.6, reviewCount: 389, createdAt: new Date().toISOString() },
  { id: 12, name: 'Nordic Throw Blanket', description: 'Chunky knit throw blanket in 100% organic Merino wool. Oversized 150×200cm — cozy, warm and beautifully textured.', price: 79.99, stockQuantity: 40, category: 'Home & Garden', sku: 'HOME-004', imageUrl: getMockProductImageUrl('ThrowBlanket.jpg'), rating: 4.8, reviewCount: 211, createdAt: new Date().toISOString() },
];

function initMockDb() {
  if (!localStorage.getItem('mock_users')) {
    const defaultUsers = [
      { id: 1, email: 'admin@shop.com', password: 'admin123', firstName: 'Admin', lastName: 'User', isAdmin: true },
      { id: 2, email: 'demo@shop.com', password: 'user123', firstName: 'Jane', lastName: 'Doe', isAdmin: false }
    ];
    localStorage.setItem('mock_users', JSON.stringify(defaultUsers));
  }

  // Always refresh products from source so image updates take effect immediately
  localStorage.setItem('mock_products', JSON.stringify(MOCK_PRODUCTS));

  if (!localStorage.getItem('mock_orders')) {
    const defaultOrders = [
      {
        id: 10001,
        userId: 2,
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
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        items: [
          {
            id: 1,
            productId: 1,
            quantity: 1,
            unitPriceAtPurchase: 129.99,
            product: MOCK_PRODUCTS[0]
          },
          {
            id: 2,
            productId: 5,
            quantity: 1,
            unitPriceAtPurchase: 49.99,
            product: MOCK_PRODUCTS[4]
          }
        ]
      }
    ];
    localStorage.setItem('mock_orders', JSON.stringify(defaultOrders));
  }

  if (!localStorage.getItem('mock_cart')) {
    localStorage.setItem('mock_cart', JSON.stringify([]));
  }
}

function getMockUser() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  const userJson = localStorage.getItem('user');
  if (userJson) {
    try { return JSON.parse(userJson); } catch { return null; }
  }
  return null;
}

function getMockCartIdentifier() {
  const user = getMockUser();
  if (user) return { userId: user.id };
  let guestSessionId = sessionStorage.getItem('guest_session_id');
  if (!guestSessionId) {
    guestSessionId = 'guest-' + Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('guest_session_id', guestSessionId);
  }
  return { sessionId: guestSessionId };
}

function throwMockError(message, status) {
  const err = new Error(message);
  err.status = status;
  err.data = { error: 'MockError', message };
  throw err;
}

async function fileToBase64(file) {
  if (!(file instanceof File) || file.size === 0) return null;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

// 4. Mock request interceptor
async function handleMockRequest(path, options) {
  await new Promise(resolve => setTimeout(resolve, 250)); // Network delay
  
  initMockDb();
  
  // Extract path and query params (strip /api prefix)
  const cleanPath = path.startsWith('/api') ? path.substring(4) : path;
  const urlObj = new URL(cleanPath, window.location.origin);
  const pathname = urlObj.pathname;
  const method = options.method || 'GET';
  
  // Parse body
  let body = null;
  if (options.body) {
    if (options.body instanceof FormData) {
      body = {};
      for (const [key, value] of options.body.entries()) {
        body[key] = value;
      }
    } else {
      try { body = JSON.parse(options.body); } catch { body = options.body; }
    }
  }
  
  const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
  const products = JSON.parse(localStorage.getItem('mock_products') || '[]');
  const orders = JSON.parse(localStorage.getItem('mock_orders') || '[]');
  const cart = JSON.parse(localStorage.getItem('mock_cart') || '[]');
  const currentUser = getMockUser();
  
  const saveUsers = (data) => localStorage.setItem('mock_users', JSON.stringify(data));
  const saveProducts = (data) => localStorage.setItem('mock_products', JSON.stringify(data));
  const saveOrders = (data) => localStorage.setItem('mock_orders', JSON.stringify(data));
  const saveCart = (data) => localStorage.setItem('mock_cart', JSON.stringify(data));

  // --- Auth Routes ---
  if (pathname === '/auth/register' && method === 'POST') {
    const { email, password, firstName, lastName } = body;
    if (!email || !password || !firstName || !lastName) throwMockError('All fields required', 400);
    const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) throwMockError('Email already registered', 409);
    
    const newUser = {
      id: users.length ? Math.max(...users.map(u => u.id)) + 1 : 1,
      email,
      password,
      firstName,
      lastName,
      isAdmin: false
    };
    users.push(newUser);
    saveUsers(users);
    
    const token = 'mock-token-' + newUser.id + '-' + Date.now();
    
    // Merge cart
    const guestIdent = getMockCartIdentifier();
    const userCartItems = cart.filter(i => i.userId === newUser.id);
    const guestCartItems = cart.filter(i => i.sessionId === guestIdent.sessionId);
    for (const gi of guestCartItems) {
      const existingUi = userCartItems.find(ui => ui.productId === gi.productId);
      if (existingUi) {
        existingUi.quantity += gi.quantity;
      } else {
        gi.userId = newUser.id;
        delete gi.sessionId;
        userCartItems.push(gi);
      }
    }
    const finalCart = cart.filter(i => i.sessionId !== guestIdent.sessionId && i.userId !== newUser.id).concat(userCartItems);
    saveCart(finalCart);
    
    return { token, user: { id: newUser.id, email: newUser.email, firstName: newUser.firstName, lastName: newUser.lastName, isAdmin: newUser.isAdmin } };
  }
  
  if (pathname === '/auth/login' && method === 'POST') {
    const { email, password } = body;
    if (!email || !password) throwMockError('Email and password required', 400);
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) throwMockError('Invalid credentials', 401);
    
    const token = 'mock-token-' + user.id + '-' + Date.now();
    
    // Merge cart
    let guestSessionId = sessionStorage.getItem('guest_session_id');
    if (guestSessionId) {
      const userCartItems = cart.filter(i => i.userId === user.id);
      const guestCartItems = cart.filter(i => i.sessionId === guestSessionId);
      for (const gi of guestCartItems) {
        const existingUi = userCartItems.find(ui => ui.productId === gi.productId);
        if (existingUi) {
          existingUi.quantity += gi.quantity;
        } else {
          gi.userId = user.id;
          delete gi.sessionId;
          userCartItems.push(gi);
        }
      }
      const finalCart = cart.filter(i => i.sessionId !== guestSessionId && i.userId !== user.id).concat(userCartItems);
      saveCart(finalCart);
    }
    
    return { token, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, isAdmin: user.isAdmin } };
  }
  
  if (pathname === '/auth/logout' && method === 'POST') {
    return { message: 'Logged out successfully' };
  }
  
  if (pathname === '/auth/me' && method === 'GET') {
    if (!currentUser) throwMockError('Unauthorized', 401);
    return { user: currentUser };
  }

  // --- Product Routes ---
  if (pathname === '/products' && method === 'GET') {
    const params = urlObj.searchParams;
    const search = params.get('search') || '';
    const category = params.get('category') || '';
    const minPrice = parseFloat(params.get('minPrice') || '0');
    const maxPrice = parseFloat(params.get('maxPrice') || '999999');
    const page = parseInt(params.get('page') || '1');
    const limit = parseInt(params.get('limit') || '12');
    const sort = params.get('sort') || '';
    
    let filtered = products.filter(p => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (category && p.category !== category) return false;
      if (p.price < minPrice || p.price > maxPrice) return false;
      return true;
    });
    
    if (sort === 'price_asc') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sort === 'price_desc') {
      filtered.sort((a, b) => b.price - a.price);
    } else if (sort === 'newest') {
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else {
      filtered.sort((a, b) => a.id - b.id);
    }
    
    const total = filtered.length;
    const pages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    return { products: filtered.slice(offset, offset + limit), total, page, pages };
  }
  
  if (pathname === '/products/categories' && method === 'GET') {
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))];
    return { categories: cats };
  }
  
  const productMatch = pathname.match(/^\/products\/([0-9]+)$/);
  if (productMatch && method === 'GET') {
    const prodId = parseInt(productMatch[1]);
    const product = products.find(p => p.id === prodId);
    if (!product) throwMockError('Product not found', 404);
    return { product };
  }

  // --- Cart Routes ---
  if (pathname === '/cart' && method === 'GET') {
    const ident = getMockCartIdentifier();
    const userCart = ident.userId ? cart.filter(i => i.userId === ident.userId) : cart.filter(i => i.sessionId === ident.sessionId);
    const itemsWithProduct = userCart.map(item => {
      const prod = products.find(p => p.id === item.productId);
      return { ...item, product: prod };
    }).filter(item => item.product);
    const subtotal = itemsWithProduct.reduce((sum, i) => sum + parseFloat(i.product.price) * i.quantity, 0);
    return { items: itemsWithProduct, subtotal: subtotal.toFixed(2) };
  }
  
  if (pathname === '/cart' && method === 'POST') {
    const { productId, quantity = 1 } = body;
    if (!productId) throwMockError('productId required', 400);
    const product = products.find(p => p.id === parseInt(productId));
    if (!product) throwMockError('Product not found', 404);
    if (product.stockQuantity < quantity) throwMockError('Insufficient stock', 400);
    
    const ident = getMockCartIdentifier();
    let existingItem = ident.userId ? 
      cart.find(i => i.userId === ident.userId && i.productId === product.id) :
      cart.find(i => i.sessionId === ident.sessionId && i.productId === product.id);
    
    if (existingItem) {
      existingItem.quantity += parseInt(quantity);
    } else {
      const newItem = {
        id: cart.length ? Math.max(...cart.map(c => c.id)) + 1 : 1,
        productId: product.id,
        quantity: parseInt(quantity),
        ...(ident.userId ? { userId: ident.userId } : { sessionId: ident.sessionId })
      };
      cart.push(newItem);
    }
    saveCart(cart);
    const itemToReturn = ident.userId ? 
      cart.find(i => i.userId === ident.userId && i.productId === product.id) :
      cart.find(i => i.sessionId === ident.sessionId && i.productId === product.id);
    return { item: { ...itemToReturn, product }, message: 'Added to cart' };
  }
  
  const cartItemMatch = pathname.match(/^\/cart\/([0-9]+)$/);
  if (cartItemMatch && method === 'PATCH') {
    const itemId = parseInt(cartItemMatch[1]);
    const { quantity } = body;
    if (!quantity || quantity < 1) throwMockError('Quantity must be >= 1', 400);
    const item = cart.find(i => i.id === itemId);
    if (!item) throwMockError('Cart item not found', 404);
    const product = products.find(p => p.id === item.productId);
    if (product && product.stockQuantity < quantity) throwMockError('Insufficient stock', 400);
    
    item.quantity = parseInt(quantity);
    saveCart(cart);
    return { item: { ...item, product } };
  }
  
  if (cartItemMatch && method === 'DELETE') {
    const itemId = parseInt(cartItemMatch[1]);
    const index = cart.findIndex(i => i.id === itemId);
    if (index === -1) throwMockError('Cart item not found', 404);
    cart.splice(index, 1);
    saveCart(cart);
    return { message: 'Item removed' };
  }

  // --- Order Routes ---
  if (pathname === '/orders' && method === 'POST') {
    if (!currentUser) throwMockError('Unauthorized', 401);
    const { shippingAddress } = body;
    if (!shippingAddress) throwMockError('Shipping address required', 400);
    
    const userCart = cart.filter(i => i.userId === currentUser.id);
    if (!userCart.length) throwMockError('Cart is empty', 400);
    
    let totalPrice = 0;
    const orderItems = [];
    for (const ci of userCart) {
      const prod = products.find(p => p.id === ci.productId);
      if (!prod || prod.stockQuantity < ci.quantity) {
        throwMockError(`Insufficient stock for ${prod ? prod.name : 'Product'}`, 400);
      }
      totalPrice += parseFloat(prod.price) * ci.quantity;
      orderItems.push({
        id: orderItems.length + 1,
        productId: ci.productId,
        quantity: ci.quantity,
        unitPriceAtPurchase: prod.price,
        product: prod
      });
      prod.stockQuantity -= ci.quantity;
    }
    
    saveProducts(products);
    const newOrder = {
      id: orders.length ? Math.max(...orders.map(o => o.id)) + 1 : 10002,
      userId: currentUser.id,
      totalPrice: totalPrice.toFixed(2),
      shippingAddressJson: shippingAddress,
      status: 'pending',
      createdAt: new Date().toISOString(),
      items: orderItems
    };
    orders.push(newOrder);
    saveOrders(orders);
    
    const remainingCart = cart.filter(i => i.userId !== currentUser.id);
    saveCart(remainingCart);
    return { order: newOrder };
  }
  
  if (pathname === '/orders' && method === 'GET') {
    if (!currentUser) throwMockError('Unauthorized', 401);
    return { orders: orders.filter(o => o.userId === currentUser.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) };
  }
  
  const orderMatch = pathname.match(/^\/orders\/([0-9]+)$/);
  if (orderMatch && method === 'GET') {
    if (!currentUser) throwMockError('Unauthorized', 401);
    const orderId = parseInt(orderMatch[1]);
    const order = orders.find(o => o.id === orderId && o.userId === currentUser.id);
    if (!order) throwMockError('Order not found', 404);
    return { order };
  }

  // --- Admin Routes ---
  if (pathname === '/admin/stats' && method === 'GET') {
    if (!currentUser || !currentUser.isAdmin) throwMockError('Forbidden', 403);
    const totalProducts = products.length;
    const totalOrders = orders.length;
    const totalUsers = users.length;
    const validOrders = orders.filter(o => ['pending', 'confirmed', 'shipped', 'delivered'].includes(o.status));
    const revenue = validOrders.reduce((sum, o) => sum + parseFloat(o.totalPrice), 0);
    const recentOrders = orders.map(o => {
      const u = users.find(x => x.id === o.userId) || { firstName: 'Guest', lastName: 'User', email: 'guest@shop.com' };
      return { ...o, user: { firstName: u.firstName, lastName: u.lastName, email: u.email } };
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
    return { totalProducts, totalOrders, totalUsers, revenue: revenue || 0, recentOrders };
  }
  
  if (pathname === '/admin/products' && method === 'GET') {
    if (!currentUser || !currentUser.isAdmin) throwMockError('Forbidden', 403);
    return { products };
  }
  
  if (pathname === '/admin/products' && method === 'POST') {
    if (!currentUser || !currentUser.isAdmin) throwMockError('Forbidden', 403);
    const { name, description, price, stockQuantity, category, sku } = body;
    if (!name || !price) throwMockError('Name and price required', 400);
    
    let imageUrl = body.imageUrl || '';
    if (body.image) {
      const base64 = await fileToBase64(body.image);
      if (base64) imageUrl = base64;
    }
    if (!imageUrl) {
      imageUrl = 'https://picsum.photos/seed/' + Math.random().toString(36).substring(2, 7) + '/600/400';
    }
    
    const newProduct = {
      id: products.length ? Math.max(...products.map(p => p.id)) + 1 : 1,
      name,
      description: description || '',
      price: parseFloat(price),
      stockQuantity: parseInt(stockQuantity || '0'),
      category: category || 'Other',
      sku: sku || 'SKU-' + Math.floor(Math.random() * 10000),
      imageUrl,
      rating: 5.0,
      reviewCount: 0,
      createdAt: new Date().toISOString()
    };
    products.push(newProduct);
    saveProducts(products);
    return { product: newProduct };
  }
  
  const adminProdMatch = pathname.match(/^\/admin\/products\/([0-9]+)$/);
  if (adminProdMatch && method === 'PATCH') {
    if (!currentUser || !currentUser.isAdmin) throwMockError('Forbidden', 403);
    const prodId = parseInt(adminProdMatch[1]);
    const product = products.find(p => p.id === prodId);
    if (!product) throwMockError('Product not found', 404);
    
    let imageUrl = body.imageUrl || product.imageUrl;
    if (body.image) {
      const base64 = await fileToBase64(body.image);
      if (base64) imageUrl = base64;
    }
    
    const updatedProduct = {
      ...product,
      name: body.name !== undefined ? body.name : product.name,
      description: body.description !== undefined ? body.description : product.description,
      price: body.price !== undefined ? parseFloat(body.price) : product.price,
      stockQuantity: body.stockQuantity !== undefined ? parseInt(body.stockQuantity) : product.stockQuantity,
      category: body.category !== undefined ? body.category : product.category,
      sku: body.sku !== undefined ? body.sku : product.sku,
      imageUrl
    };
    
    const idx = products.findIndex(p => p.id === prodId);
    products[idx] = updatedProduct;
    saveProducts(products);
    return { product: updatedProduct };
  }
  
  if (adminProdMatch && method === 'DELETE') {
    if (!currentUser || !currentUser.isAdmin) throwMockError('Forbidden', 403);
    const prodId = parseInt(adminProdMatch[1]);
    const idx = products.findIndex(p => p.id === prodId);
    if (idx === -1) throwMockError('Product not found', 404);
    products.splice(idx, 1);
    saveProducts(products);
    return { message: 'Product deleted' };
  }
  
  if (pathname === '/admin/orders' && method === 'GET') {
    if (!currentUser || !currentUser.isAdmin) throwMockError('Forbidden', 403);
    const adminOrders = orders.map(o => {
      const u = users.find(x => x.id === o.userId) || { firstName: 'Guest', lastName: 'User', email: 'guest@shop.com' };
      return { ...o, user: { firstName: u.firstName, lastName: u.lastName, email: u.email } };
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return { orders: adminOrders };
  }
  
  const adminOrderMatch = pathname.match(/^\/admin\/orders\/([0-9]+)$/);
  if (adminOrderMatch && method === 'PATCH') {
    if (!currentUser || !currentUser.isAdmin) throwMockError('Forbidden', 403);
    const orderId = parseInt(adminOrderMatch[1]);
    const { status } = body;
    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) throwMockError('Invalid status', 400);
    
    const order = orders.find(o => o.id === orderId);
    if (!order) throwMockError('Order not found', 404);
    
    order.status = status;
    saveOrders(orders);
    return { order };
  }
  
  throwMockError(`Endpoint ${method} ${pathname} not mocked`, 404);
}

// 5. Normal Fetch Request
async function request(path, options = {}) {
  if (useMock) {
    return handleMockRequest(path, options);
  }

  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(API_BASE + path, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.message || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),

  // Multipart form (for file uploads)
  postForm: async (path, formData) => {
    if (useMock) {
      return handleMockRequest(path, { method: 'POST', body: formData });
    }
    const token = getToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(API_BASE + path, { method: 'POST', headers, body: formData });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { const err = new Error(data.message || 'Request failed'); err.status = res.status; throw err; }
    return data;
  },
  patchForm: async (path, formData) => {
    if (useMock) {
      return handleMockRequest(path, { method: 'PATCH', body: formData });
    }
    const token = getToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(API_BASE + path, { method: 'PATCH', headers, body: formData });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { const err = new Error(data.message || 'Request failed'); err.status = res.status; throw err; }
    return data;
  },
};

window.api = api;
