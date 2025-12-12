/**
 * Socket.io Connection Test Script
 * 
 * Run this to test if socket.io real-time updates are working:
 * 
 * Usage:
 *   node scripts/test-socket.js [BACKEND_URL] [API_KEY]
 * 
 * Examples:
 *   node scripts/test-socket.js http://localhost:5000 Source@826459
 *   node scripts/test-socket.js https://your-tunnel.trycloudflare.com Source@826459
 */

const { io } = require('socket.io-client');

// Configuration from command line or defaults
const BACKEND_URL = process.argv[2] || 'http://localhost:5000';
const API_KEY = process.argv[3] || 'Source@826459';

console.log('========================================');
console.log('Socket.io Real-time Test');
console.log('========================================');
console.log(`Backend URL: ${BACKEND_URL}`);
console.log(`API Key: ${API_KEY.substring(0, 3)}***`);
console.log('');

// Create socket connection
const socket = io(BACKEND_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
  timeout: 10000,
  auth: {
    apiKey: API_KEY
  },
  transports: ['websocket', 'polling']
});

// Connection events
socket.on('connect', () => {
  console.log('✅ CONNECTED to backend');
  console.log(`   Socket ID: ${socket.id}`);
  console.log('');
  
  // Subscribe to all updates (admin mode)
  console.log('📡 Subscribing to all updates (admin)...');
  socket.emit('subscribeToAll');
  
  // Also try subscribing to a test cluster
  console.log('📡 Subscribing to cluster: Jeddah...');
  socket.emit('subscribeToCluster', 'Jeddah');
  
  console.log('');
  console.log('🎧 Listening for events...');
  console.log('   - attendanceUpdated');
  console.log('   - employeeUpdated');
  console.log('');
  console.log('👉 Now go to the Kiosk and mark someone\'s attendance.');
  console.log('   You should see the update here within seconds.');
  console.log('');
  console.log('Press Ctrl+C to exit.');
  console.log('----------------------------------------');
});

socket.on('disconnect', (reason) => {
  console.log('❌ DISCONNECTED:', reason);
});

socket.on('connect_error', (error) => {
  console.log('❌ CONNECTION ERROR:', error.message);
  console.log('');
  console.log('Possible causes:');
  console.log('  1. Backend server not running');
  console.log('  2. Wrong URL');
  console.log('  3. Wrong API key');
  console.log('  4. CORS issues');
  console.log('');
});

socket.on('error', (error) => {
  console.log('❌ SOCKET ERROR:', error);
});

// Listen for attendance updates
socket.on('attendanceUpdated', (data) => {
  console.log('');
  console.log('🔔 ========== ATTENDANCE UPDATE RECEIVED ==========');
  console.log('   Time:', new Date().toISOString());
  console.log('   Data:', JSON.stringify(data, null, 2));
  console.log('===================================================');
  console.log('');
});

// Listen for employee updates
socket.on('employeeUpdated', (data) => {
  console.log('');
  console.log('🔔 ========== EMPLOYEE UPDATE RECEIVED ==========');
  console.log('   Time:', new Date().toISOString());
  console.log('   Data:', JSON.stringify(data, null, 2));
  console.log('=================================================');
  console.log('');
});

// Ping test every 10 seconds
setInterval(() => {
  if (socket.connected) {
    const start = Date.now();
    socket.emit('ping');
    socket.once('pong', () => {
      const latency = Date.now() - start;
      console.log(`📶 Ping: ${latency}ms`);
    });
  }
}, 10000);

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('');
  console.log('Disconnecting...');
  socket.disconnect();
  process.exit(0);
});
