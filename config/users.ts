import { KioskUser, AdminUser } from '@/types/auth';

/**
 * Hardcoded kiosk users for each geographic cluster
 * Passwords are hashed using SHA-256 for security
 * 
 * Default passwords for development:
 * - vja_user1: "vijayawada1"
 * - vja_user2: "vijayawada2" 
 * - vja_user3: "vijayawada3"
 * - vja_user4: "vijayawada4"
 * - nel_user1: "nellore1"
 * - nel_user2: "nellore2"
 * - nel_user3: "nellore3"
 * - nel_user4: "nellore4"
 * - vsk_user1: "visakhapatnam1"
 * - vsk_user2: "visakhapatnam2"
 * - vsk_user3: "visakhapatnam3"
 * - vsk_user4: "visakhapatnam4"
 */
export const KIOSK_USERS: KioskUser[] = [
  // Vijayawada Users
  { 
    username: 'vja_user1', 
    passwordHash: '6083dac364caf1ef702e98f50446de12aed029d0322e42d4cf7e6bd7e01e527c', // vijayawada1
    cluster: 'Vijayawada', 
    displayName: 'Vijayawada Kiosk 1' 
  },
  { 
    username: 'vja_user2', 
    passwordHash: '428f23adc58207b6b7799eb73e291fe00020207d1dc333effb8cb6ed14cb787b', // vijayawada2
    cluster: 'Vijayawada', 
    displayName: 'Vijayawada Kiosk 2' 
  },
  { 
    username: 'vja_user3', 
    passwordHash: '347470eabb19fe854ec15c42d9d98ce723f6e603ad5ed244ce3a9cf021ced18b', // vijayawada3
    cluster: 'Vijayawada', 
    displayName: 'Vijayawada Kiosk 3' 
  },
  { 
    username: 'vja_user4', 
    passwordHash: '1cc824171dc6b03236d9a41b04ae5634cfa726a19f70bec5b1d361ad5d06ec38', // vijayawada4
    cluster: 'Vijayawada', 
    displayName: 'Vijayawada Kiosk 4' 
  },
  
  // Nellore Users
  { 
    username: 'nel_user1', 
    passwordHash: '6fb10fc2727b7a5f1dddcdca9dedcb95565be4d254a330f78c433bf8e92121b9', // nellore1
    cluster: 'Nellore', 
    displayName: 'Nellore Kiosk 1' 
  },
  { 
    username: 'nel_user2', 
    passwordHash: '9e7782b6d9a94233e03abbd033c621ccecf1460d31e427a05a011a71c774aafd', // nellore2
    cluster: 'Nellore', 
    displayName: 'Nellore Kiosk 2' 
  },
  { 
    username: 'nel_user3', 
    passwordHash: '5ff243dbb88beafe460eece7aee3e61a9ddbdfe19e9615abc230aac0942daf7d', // nellore3
    cluster: 'Nellore', 
    displayName: 'Nellore Kiosk 3' 
  },
  { 
    username: 'nel_user4', 
    passwordHash: '3161b48c50f3593531453b5c07e2c1f9b1d4adbd72853b6713376d9687f65c80', // nellore4
    cluster: 'Nellore', 
    displayName: 'Nellore Kiosk 4' 
  },
  
  // Visakhapatnam Users
  { 
    username: 'vsk_user1', 
    passwordHash: '8867e76d9538e0cf1ce2f481c7c16e7857cb3be0a109fc483aaf7e6412c0e70f', // visakhapatnam1
    cluster: 'Visakhapatnam', 
    displayName: 'Visakhapatnam Kiosk 1' 
  },
  { 
    username: 'vsk_user2', 
    passwordHash: 'ffbc7a84274d732779a698b09eb753887ffc2ef4f42fe40c218c20b956b778a7', // visakhapatnam2
    cluster: 'Visakhapatnam', 
    displayName: 'Visakhapatnam Kiosk 2' 
  },
  { 
    username: 'vsk_user3', 
    passwordHash: '921360439ce2995f20c46de2e6cbb028d698ccd935dbf76aebce0e9715a544e8', // visakhapatnam3
    cluster: 'Visakhapatnam', 
    displayName: 'Visakhapatnam Kiosk 3' 
  },
  { 
    username: 'vsk_user4', 
    passwordHash: 'f71738882dac4283aaccb694a18c2eaa3c97b0616b205ed0ccbb58533afb2ea7', // visakhapatnam4
    cluster: 'Visakhapatnam', 
    displayName: 'Visakhapatnam Kiosk 4' 
  }
];

/**
 * Hardcoded admin user
 * Default password for development: "admin123"
 */
export const ADMIN_USER: AdminUser = {
  username: 'admin',
  passwordHash: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', // admin123
  role: 'admin'
};

/**
 * Find a kiosk user by username
 */
export function findKioskUser(username: string): KioskUser | undefined {
  return KIOSK_USERS.find(user => user.username === username);
}

/**
 * Find admin user by username
 */
export function findAdminUser(username: string): AdminUser | undefined {
  return username === ADMIN_USER.username ? ADMIN_USER : undefined;
}

/**
 * Get all users for a specific cluster
 */
export function getUsersByCluster(cluster: string): KioskUser[] {
  return KIOSK_USERS.filter(user => user.cluster === cluster);
}