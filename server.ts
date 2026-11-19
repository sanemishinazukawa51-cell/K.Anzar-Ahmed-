import crypto from 'crypto';
import dotenv from 'dotenv';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  buildQrPayload,
  calculatePrepBreakdown,
  computeAnalyticsMetrics,
  evaluateSlots,
  formatMinutesToClock,
  getActiveQueuedOrdersCount,
  parseVerificationQuery,
} from './src/engine/queueEngine.ts';
import type {
  AuthRole,
  AuthUser,
  CartItem,
  KitchenConfig,
  MenuCategory,
  MenuItem,
  Order,
  OrderStatus,
  PickupSlot,
} from './src/types/canteen.ts';

dotenv.config();

interface StoredUser {
  id: string;
  role: AuthRole;
  name: string;
  email: string;
  rollNumber?: string;
  department?: string;
  staffId?: string;
  station?: string;
  salt: string;
  passwordHash: string;
}

interface StoredSession {
  token: string;
  userId: string;
  createdAt: number;
}

interface CanteenDatabase {
  users: StoredUser[];
  sessions: StoredSession[];
  currentTimeMinutes: number;
  menu: MenuItem[];
  slots: PickupSlot[];
  orders: Order[];
  kitchenConfig: KitchenConfig;
}

interface AuthenticatedRequest extends Request {
  authUser?: AuthUser;
  authToken?: string;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'canteen-db.json');

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const actual = hashPassword(password, salt);
  const actualBuf = Buffer.from(actual, 'hex');
  const expectedBuf = Buffer.from(expectedHash, 'hex');
  if (actualBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

function createSeedUsers(): StoredUser[] {
  const makeUser = (
    user: Omit<StoredUser, 'salt' | 'passwordHash'>,
    plainPassword: string
  ): StoredUser => {
    const salt = crypto.randomBytes(16).toString('hex');
    return {
      ...user,
      salt,
      passwordHash: hashPassword(plainPassword, salt),
    };
  };

  return [
    makeUser(
      {
        id: 'stu_aarav',
        role: 'student',
        name: 'Aarav Mehta',
        email: 'aarav@campus.edu',
        rollNumber: 'CS-2026-042',
        department: 'Computer Science',
      },
      'student123'
    ),
    makeUser(
      {
        id: 'stu_maya',
        role: 'student',
        name: 'Maya Lin',
        email: 'maya@campus.edu',
        rollNumber: 'ME-2026-118',
        department: 'Mechanical Eng.',
      },
      'student123'
    ),
    makeUser(
      {
        id: 'stu_zara',
        role: 'student',
        name: 'Zara Chen',
        email: 'zara@campus.edu',
        rollNumber: 'EC-2026-089',
        department: 'Economics',
      },
      'student123'
    ),
    makeUser(
      {
        id: 'adm_vikram',
        role: 'admin',
        name: 'Chef Vikram Rao',
        email: 'kitchen@campus.edu',
        staffId: 'ADMIN-01',
        station: 'Main Kitchen Lead',
      },
      'admin123'
    ),
    makeUser(
      {
        id: 'adm_priya',
        role: 'admin',
        name: 'Priya Nair',
        email: 'counter@campus.edu',
        staffId: 'STAFF-02',
        station: 'Pickup Counter & QR Desk',
      },
      'admin123'
    ),
  ];
}

function toPublicUser(u: StoredUser): AuthUser {
  return {
    id: u.id,
    role: u.role,
    name: u.name,
    email: u.email,
    rollNumber: u.rollNumber,
    department: u.department,
    staffId: u.staffId,
    station: u.station,
  };
}

function createInitialMenu(): MenuItem[] {
  return [
    {
      id: 'dish_teriyaki_bowl',
      name: 'Teriyaki Chicken Grain Bowl',
      description:
        'Char-grilled teriyaki chicken over steamed jasmine rice, edamame, crispy shallots, and sesame greens.',
      category: 'Bowls & Meals',
      price: 190,
      calories: 620,
      prepTimeMinutes: 9,
      workloadPoints: 10,
      stock: 14,
      isVeg: false,
      isAvailable: true,
      popular: true,
      imageUrl: '/src/assets/images/teriyaki_chicken_bowl_1795060285565.jpg',
    },
    {
      id: 'dish_falafel_bowl',
      name: 'Mediterranean Falafel & Quinoa Bowl',
      description:
        'Herbed crispy falafel, warm spiced quinoa, roasted chickpeas, cucumber salad, and lemon tahini drizzle.',
      category: 'Bowls & Meals',
      price: 175,
      calories: 540,
      prepTimeMinutes: 8,
      workloadPoints: 9,
      stock: 11,
      isVeg: true,
      isAvailable: true,
      popular: true,
      imageUrl: '/src/assets/images/falafel_quinoa_bowl_1795060285347.jpg',
    },
    {
      id: 'dish_tofu_udon',
      name: 'Spicy Sesame Tofu Noodle Bowl',
      description:
        'Wok-tossed udon noodles with crispy chili garlic tofu, bok choy, scallions, and toasted sesame broth.',
      category: 'Bowls & Meals',
      price: 165,
      calories: 510,
      prepTimeMinutes: 8,
      workloadPoints: 9,
      stock: 0,
      isVeg: true,
      isAvailable: false,
      popular: false,
      imageUrl: '/src/assets/images/spicy_tofu_udon_1795060286156.jpg',
    },
    {
      id: 'dish_paneer_panini',
      name: 'Crispy Paneer Pesto Panini',
      description:
        'Pressed sourdough filled with seared tandoori paneer, basil pesto, roasted bell peppers, and melted mozzarella.',
      category: 'Wraps & Sandwiches',
      price: 160,
      calories: 560,
      prepTimeMinutes: 7,
      workloadPoints: 7,
      stock: 9,
      isVeg: true,
      isAvailable: true,
      popular: true,
      imageUrl: '/src/assets/images/paneer_pesto_panini_1795060286390.jpg',
    },
    {
      id: 'dish_chipotle_wrap',
      name: 'Smoky Chipotle Chicken Wrap',
      description:
        'Grilled chipotle chicken strips, black beans, charred corn salsa, crisp romaine, and lime crema in toasted flatbread.',
      category: 'Wraps & Sandwiches',
      price: 150,
      calories: 495,
      prepTimeMinutes: 6,
      workloadPoints: 6,
      stock: 16,
      isVeg: false,
      isAvailable: true,
      popular: true,
      imageUrl: '/src/assets/images/chipotle_chicken_wrap_1795060285094.jpg',
    },
    {
      id: 'dish_avocado_brioche',
      name: 'Herb Avocado & Egg Brioche',
      description:
        'Toasted butter brioche layered with smashed avocado, soft scrambled eggs, microgreens, and flaky chili salt.',
      category: 'Wraps & Sandwiches',
      price: 135,
      calories: 440,
      prepTimeMinutes: 5,
      workloadPoints: 5,
      stock: 3,
      isVeg: false,
      isAvailable: true,
      popular: false,
      imageUrl: '/src/assets/images/avocado_egg_brioche_1795060286448.jpg',
    },
    {
      id: 'dish_parmesan_fries',
      name: 'Crispy Herb & Parmesan Fries',
      description:
        'Golden skin-on potato fries tossed in rosemary garlic oil, aged parmesan, and roasted garlic aioli.',
      category: 'Snacks & Sides',
      price: 85,
      calories: 380,
      prepTimeMinutes: 4,
      workloadPoints: 4,
      stock: 22,
      isVeg: true,
      isAvailable: true,
      popular: true,
      imageUrl: '/src/assets/images/herb_parmesan_fries_1795060285664.jpg',
    },
    {
      id: 'dish_samosa_chaat',
      name: 'Crispy Samosa Chaat Box',
      description:
        'Crushed flaky punjabi samosas topped with spiced chickpeas, mint-coriander chutney, tamarind glaze, and sev.',
      category: 'Snacks & Sides',
      price: 95,
      calories: 410,
      prepTimeMinutes: 4,
      workloadPoints: 4,
      stock: 4,
      isVeg: true,
      isAvailable: true,
      popular: true,
      imageUrl: '/src/assets/images/samosa_chaat_box_1795060285359.jpg',
    },
    {
      id: 'dish_yogurt_parfait',
      name: 'Berry Granola Yogurt Cup',
      description:
        'Chilled Greek yogurt layered with wild blueberry compote, honey oat clusters, and fresh strawberries.',
      category: 'Snacks & Sides',
      price: 90,
      calories: 290,
      prepTimeMinutes: 2,
      workloadPoints: 2,
      stock: 15,
      isVeg: true,
      isAvailable: true,
      popular: false,
      imageUrl: '/src/assets/images/berry_yogurt_parfait_1795060285126.jpg',
    },
    {
      id: 'dish_caramel_coldbrew',
      name: 'Iced Caramel Cold Brew',
      description:
        'Slow-steeped cold brew over ice with silky oat milk cascade and house caramel drizzle.',
      category: 'Drinks & Coffee',
      price: 85,
      calories: 160,
      prepTimeMinutes: 2,
      workloadPoints: 2,
      stock: 25,
      isVeg: true,
      isAvailable: true,
      popular: true,
      imageUrl: '/src/assets/images/iced_caramel_coldbrew_1795060285039.jpg',
    },
    {
      id: 'dish_matcha_latte',
      name: 'Iced Ceremonial Matcha Latte',
      description:
        'First-harvest emerald matcha whisked over chilled oat milk and crystal-clear ice.',
      category: 'Drinks & Coffee',
      price: 95,
      calories: 180,
      prepTimeMinutes: 3,
      workloadPoints: 2,
      stock: 18,
      isVeg: true,
      isAvailable: true,
      popular: true,
      imageUrl: '/src/assets/images/iced_matcha_latte_1795060285169.jpg',
    },
    {
      id: 'dish_mango_cooler',
      name: 'Fresh Mango Mint Cooler',
      description:
        'Sparkling mango spritzer with crushed ice, muddled mint sprigs, and fresh lime.',
      category: 'Drinks & Coffee',
      price: 80,
      calories: 130,
      prepTimeMinutes: 2,
      workloadPoints: 2,
      stock: 19,
      isVeg: true,
      isAvailable: true,
      popular: false,
      imageUrl: '/src/assets/images/mango_mint_cooler_1795060285154.jpg',
    },
  ];
}

function createInitialSlots(): PickupSlot[] {
  return [
    {
      id: 'slot_1200',
      label: '12:00–12:15 PM',
      shortLabel: '12:00',
      startMinutes: 720,
      endMinutes: 735,
      maxOrders: 5,
      maxWorkloadPoints: 36,
      isPaused: false,
    },
    {
      id: 'slot_1215',
      label: '12:15–12:30 PM',
      shortLabel: '12:15',
      startMinutes: 735,
      endMinutes: 750,
      maxOrders: 5,
      maxWorkloadPoints: 36,
      isPaused: false,
    },
    {
      id: 'slot_1230',
      label: '12:30–12:45 PM',
      shortLabel: '12:30',
      startMinutes: 750,
      endMinutes: 765,
      maxOrders: 5,
      maxWorkloadPoints: 36,
      isPaused: false,
    },
    {
      id: 'slot_1245',
      label: '12:45–1:00 PM',
      shortLabel: '12:45',
      startMinutes: 765,
      endMinutes: 780,
      maxOrders: 5,
      maxWorkloadPoints: 36,
      isPaused: false,
    },
    {
      id: 'slot_1300',
      label: '1:00–1:15 PM',
      shortLabel: '1:00',
      startMinutes: 780,
      endMinutes: 795,
      maxOrders: 5,
      maxWorkloadPoints: 36,
      isPaused: false,
    },
    {
      id: 'slot_1315',
      label: '1:15–1:30 PM',
      shortLabel: '1:15',
      startMinutes: 795,
      endMinutes: 810,
      maxOrders: 5,
      maxWorkloadPoints: 36,
      isPaused: false,
    },
    {
      id: 'slot_1330',
      label: '1:30–1:45 PM',
      shortLabel: '1:30',
      startMinutes: 810,
      endMinutes: 825,
      maxOrders: 5,
      maxWorkloadPoints: 36,
      isPaused: false,
    },
    {
      id: 'slot_1345',
      label: '1:45–2:00 PM',
      shortLabel: '1:45',
      startMinutes: 825,
      endMinutes: 840,
      maxOrders: 5,
      maxWorkloadPoints: 36,
      isPaused: false,
    },
  ];
}

function makeInitialOrder(
  id: string,
  token: string,
  pin: string,
  studentId: string,
  studentName: string,
  slotId: string,
  slotLabel: string,
  status: OrderStatus,
  items: Order['items'],
  estimatedPrepMinutes: number,
  counterLabel: string,
  createdAtLabel: string,
  kitchenNote?: string
): Order {
  return {
    id,
    token,
    pin,
    studentId,
    studentName,
    slotId,
    slotLabel,
    status,
    items,
    totalAmount: items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    totalWorkloadPoints: items.reduce(
      (sum, item) => sum + item.workloadPoints * item.quantity,
      0
    ),
    estimatedPrepMinutes,
    kitchenNote,
    counterLabel,
    createdAtLabel,
    qrPayload: buildQrPayload(id, slotId, pin),
  };
}

function createInitialOrders(): Order[] {
  return [
    makeInitialOrder(
      'ORD-087',
      'QFC-087',
      '1942',
      'stu_aarav',
      'Aarav Mehta',
      'slot_1200',
      '12:00–12:15 PM',
      'Collected',
      [
        {
          menuItemId: 'dish_chipotle_wrap',
          name: 'Smoky Chipotle Chicken Wrap',
          quantity: 1,
          unitPrice: 150,
          prepTimeMinutes: 6,
          workloadPoints: 6,
          isVeg: false,
        },
        {
          menuItemId: 'dish_mango_cooler',
          name: 'Fresh Mango Mint Cooler',
          quantity: 1,
          unitPrice: 80,
          prepTimeMinutes: 2,
          workloadPoints: 2,
          isVeg: true,
        },
      ],
      9,
      'Counter B',
      '11:46 AM'
    ),
    makeInitialOrder(
      'ORD-092',
      'QFC-092',
      '6051',
      'stu_aarav',
      'Aarav Mehta',
      'slot_1200',
      '12:00–12:15 PM',
      'Collected',
      [
        {
          menuItemId: 'dish_yogurt_parfait',
          name: 'Berry Granola Yogurt Cup',
          quantity: 1,
          unitPrice: 90,
          prepTimeMinutes: 2,
          workloadPoints: 2,
          isVeg: true,
        },
        {
          menuItemId: 'dish_matcha_latte',
          name: 'Iced Ceremonial Matcha Latte',
          quantity: 1,
          unitPrice: 95,
          prepTimeMinutes: 3,
          workloadPoints: 2,
          isVeg: true,
        },
      ],
      6,
      'Counter A',
      '11:51 AM'
    ),
    makeInitialOrder(
      'ORD-095',
      'QFC-095',
      '3318',
      'stu_maya',
      'Maya Lin',
      'slot_1200',
      '12:00–12:15 PM',
      'Collected',
      [
        {
          menuItemId: 'dish_falafel_bowl',
          name: 'Mediterranean Falafel & Quinoa Bowl',
          quantity: 1,
          unitPrice: 175,
          prepTimeMinutes: 8,
          workloadPoints: 9,
          isVeg: true,
        },
      ],
      10,
      'Counter A',
      '11:54 AM'
    ),
    makeInitialOrder(
      'ORD-099',
      'QFC-099',
      '2184',
      'stu_zara',
      'Zara Chen',
      'slot_1215',
      '12:15–12:30 PM',
      'Collected',
      [
        {
          menuItemId: 'dish_avocado_brioche',
          name: 'Herb Avocado & Egg Brioche',
          quantity: 1,
          unitPrice: 135,
          prepTimeMinutes: 5,
          workloadPoints: 5,
          isVeg: false,
        },
      ],
      7,
      'Counter B',
      '11:56 AM'
    ),
    makeInitialOrder(
      'ORD-102',
      'QFC-102',
      '5470',
      'stu_maya',
      'Maya Lin',
      'slot_1215',
      '12:15–12:30 PM',
      'Ready',
      [
        {
          menuItemId: 'dish_samosa_chaat',
          name: 'Crispy Samosa Chaat Box',
          quantity: 1,
          unitPrice: 95,
          prepTimeMinutes: 4,
          workloadPoints: 4,
          isVeg: true,
        },
        {
          menuItemId: 'dish_matcha_latte',
          name: 'Iced Ceremonial Matcha Latte',
          quantity: 1,
          unitPrice: 95,
          prepTimeMinutes: 3,
          workloadPoints: 2,
          isVeg: true,
        },
      ],
      7,
      'Counter B',
      '11:58 AM'
    ),
    makeInitialOrder(
      'ORD-104',
      'QFC-104',
      '4829',
      'stu_aarav',
      'Aarav Mehta',
      'slot_1215',
      '12:15–12:30 PM',
      'Ready',
      [
        {
          menuItemId: 'dish_paneer_panini',
          name: 'Crispy Paneer Pesto Panini',
          quantity: 1,
          unitPrice: 160,
          prepTimeMinutes: 7,
          workloadPoints: 7,
          isVeg: true,
        },
        {
          menuItemId: 'dish_caramel_coldbrew',
          name: 'Iced Caramel Cold Brew',
          quantity: 1,
          unitPrice: 85,
          prepTimeMinutes: 2,
          workloadPoints: 2,
          isVeg: true,
        },
      ],
      10,
      'Counter A',
      '12:01 PM',
      'Light ice on cold brew'
    ),
    makeInitialOrder(
      'ORD-105',
      'QFC-105',
      '8103',
      'stu_rohan',
      'Rohan Kapoor',
      'slot_1215',
      '12:15–12:30 PM',
      'Ready',
      [
        {
          menuItemId: 'dish_chipotle_wrap',
          name: 'Smoky Chipotle Chicken Wrap',
          quantity: 1,
          unitPrice: 150,
          prepTimeMinutes: 6,
          workloadPoints: 6,
          isVeg: false,
        },
      ],
      9,
      'Counter A',
      '12:02 PM'
    ),
    makeInitialOrder(
      'ORD-106',
      'QFC-106',
      '9024',
      'stu_elena',
      'Elena Rostova',
      'slot_1215',
      '12:15–12:30 PM',
      'Preparing',
      [
        {
          menuItemId: 'dish_parmesan_fries',
          name: 'Crispy Herb & Parmesan Fries',
          quantity: 1,
          unitPrice: 85,
          prepTimeMinutes: 4,
          workloadPoints: 4,
          isVeg: true,
        },
        {
          menuItemId: 'dish_mango_cooler',
          name: 'Fresh Mango Mint Cooler',
          quantity: 1,
          unitPrice: 80,
          prepTimeMinutes: 2,
          workloadPoints: 2,
          isVeg: true,
        },
      ],
      8,
      'Counter B',
      '12:03 PM'
    ),
    makeInitialOrder(
      'ORD-108',
      'QFC-108',
      '3746',
      'stu_liam',
      "Liam O'Connor",
      'slot_1230',
      '12:30–12:45 PM',
      'Preparing',
      [
        {
          menuItemId: 'dish_falafel_bowl',
          name: 'Mediterranean Falafel & Quinoa Bowl',
          quantity: 1,
          unitPrice: 175,
          prepTimeMinutes: 8,
          workloadPoints: 9,
          isVeg: true,
        },
      ],
      12,
      'Counter A',
      '12:04 PM'
    ),
    makeInitialOrder(
      'ORD-109',
      'QFC-109',
      '7391',
      'stu_aarav',
      'Aarav Mehta',
      'slot_1230',
      '12:30–12:45 PM',
      'Preparing',
      [
        {
          menuItemId: 'dish_teriyaki_bowl',
          name: 'Teriyaki Chicken Grain Bowl',
          quantity: 1,
          unitPrice: 190,
          prepTimeMinutes: 9,
          workloadPoints: 10,
          isVeg: false,
        },
      ],
      13,
      'Counter A',
      '12:05 PM',
      'Extra sesame on top'
    ),
    makeInitialOrder(
      'ORD-110',
      'QFC-110',
      '6612',
      'stu_maya',
      'Maya Lin',
      'slot_1230',
      '12:30–12:45 PM',
      'Received',
      [
        {
          menuItemId: 'dish_paneer_panini',
          name: 'Crispy Paneer Pesto Panini',
          quantity: 1,
          unitPrice: 160,
          prepTimeMinutes: 7,
          workloadPoints: 7,
          isVeg: true,
        },
      ],
      11,
      'Counter B',
      '12:06 PM'
    ),
    makeInitialOrder(
      'ORD-111',
      'QFC-111',
      '2958',
      'stu_kabir',
      'Kabir Verma',
      'slot_1230',
      '12:30–12:45 PM',
      'Received',
      [
        {
          menuItemId: 'dish_caramel_coldbrew',
          name: 'Iced Caramel Cold Brew',
          quantity: 1,
          unitPrice: 85,
          prepTimeMinutes: 2,
          workloadPoints: 2,
          isVeg: true,
        },
      ],
      6,
      'Counter B',
      '12:06 PM'
    ),
    makeInitialOrder(
      'ORD-112',
      'QFC-112',
      '4109',
      'stu_zara',
      'Zara Chen',
      'slot_1245',
      '12:45–1:00 PM',
      'Received',
      [
        {
          menuItemId: 'dish_teriyaki_bowl',
          name: 'Teriyaki Chicken Grain Bowl',
          quantity: 1,
          unitPrice: 190,
          prepTimeMinutes: 9,
          workloadPoints: 10,
          isVeg: false,
        },
      ],
      13,
      'Counter A',
      '12:07 PM'
    ),
  ];
}

function createInitialCanteenState(): Pick<
  CanteenDatabase,
  'currentTimeMinutes' | 'menu' | 'slots' | 'orders' | 'kitchenConfig'
> {
  return {
    currentTimeMinutes: 728,
    menu: createInitialMenu(),
    slots: createInitialSlots(),
    orders: createInitialOrders(),
    kitchenConfig: {
      parallelPrepStations: 3,
      defaultMaxOrdersPerSlot: 5,
      defaultMaxWorkloadPointsPerSlot: 36,
    },
  };
}

function loadDatabase(): CanteenDatabase {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    try {
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<CanteenDatabase>;
      if (
        parsed &&
        Array.isArray(parsed.users) &&
        Array.isArray(parsed.menu) &&
        Array.isArray(parsed.slots) &&
        Array.isArray(parsed.orders) &&
        parsed.kitchenConfig
      ) {
        return {
          users: parsed.users,
          sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
          currentTimeMinutes:
            typeof parsed.currentTimeMinutes === 'number'
              ? parsed.currentTimeMinutes
              : 728,
          menu: parsed.menu,
          slots: parsed.slots,
          orders: parsed.orders,
          kitchenConfig: parsed.kitchenConfig,
        };
      }
    } catch {
      // Fall through to re-seed
    }
  }

  const initial = createInitialCanteenState();
  const initialDb: CanteenDatabase = {
    users: createSeedUsers(),
    sessions: [],
    currentTimeMinutes: initial.currentTimeMinutes,
    menu: initial.menu,
    slots: initial.slots,
    orders: initial.orders,
    kitchenConfig: initial.kitchenConfig,
  };
  saveDatabase(initialDb);
  return initialDb;
}

function saveDatabase(db: CanteenDatabase): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tmpPath, DB_PATH);
}

const db: CanteenDatabase = loadDatabase();
const sseClients = new Set<Response>();

function broadcastStateUpdate(): void {
  const payload = `event: state_updated\ndata: ${JSON.stringify({
    updatedAt: Date.now(),
  })}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(payload);
    } catch {
      sseClients.delete(res);
    }
  }
}

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }
  if (typeof req.query.token === 'string' && req.query.token.trim()) {
    return req.query.token.trim();
  }
  return null;
}

function resolveAuthUser(token: string | null): AuthUser | null {
  if (!token) return null;
  const session = db.sessions.find((s) => s.token === token);
  if (!session) return null;
  const user = db.users.find((u) => u.id === session.userId);
  return user ? toPublicUser(user) : null;
}

function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const token = getBearerToken(req);
  const user = resolveAuthUser(token);
  if (!user || !token) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }
  req.authUser = user;
  req.authToken = token;
  next();
}

function requireRole(role: AuthRole) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.authUser) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (req.authUser.role !== role) {
      res.status(403).json({
        error:
          role === 'admin'
            ? 'Canteen Admin authorization required.'
            : 'Student account authorization required.',
      });
      return;
    }
    next();
  };
}

function createSessionForUser(userId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  db.sessions.push({ token, userId, createdAt: Date.now() });
  // Keep latest 100 sessions bounded
  if (db.sessions.length > 100) {
    db.sessions = db.sessions.slice(-100);
  }
  saveDatabase(db);
  return token;
}

function buildStatePayloadForUser(user: AuthUser) {
  const activeQueuedCount = getActiveQueuedOrdersCount(db.orders);
  const analytics = computeAnalyticsMetrics(
    db.slots,
    db.orders,
    db.kitchenConfig.parallelPrepStations
  );

  const slotOccupancy = db.slots.map((slot) => {
    const slotOrders = db.orders.filter((o) => o.slotId === slot.id);
    return {
      slotId: slot.id,
      orderCount: slotOrders.length,
      workloadPoints: slotOrders.reduce(
        (sum, o) => sum + o.totalWorkloadPoints,
        0
      ),
      assignedTokens:
        user.role === 'admin'
          ? slotOrders.map((o) => o.token)
          : slotOrders
              .filter((o) => o.studentId === user.id)
              .map((o) => o.token),
    };
  });

  const visibleOrders =
    user.role === 'admin'
      ? db.orders
      : db.orders.filter((o) => o.studentId === user.id);

  return {
    currentTimeMinutes: db.currentTimeMinutes,
    menu: db.menu,
    slots: db.slots,
    orders: visibleOrders,
    slotOccupancy,
    activeQueuedCount,
    kitchenConfig: db.kitchenConfig,
    analytics,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Health Check
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Public Telemetry for Landing Page (non-PII aggregate stats only)
  app.get('/api/canteen/public-telemetry', (_req, res) => {
    const activeQueuedCount = getActiveQueuedOrdersCount(db.orders);
    const readyCount = db.orders.filter((o) => o.status === 'Ready').length;
    const analytics = computeAnalyticsMetrics(
      db.slots,
      db.orders,
      db.kitchenConfig.parallelPrepStations
    );
    const baselinePrep = calculatePrepBreakdown(
      [],
      new Map(db.menu.map((m) => [m.id, m])),
      activeQueuedCount,
      db.kitchenConfig.parallelPrepStations
    );
    const slotEval = evaluateSlots(
      db.slots,
      db.orders,
      db.currentTimeMinutes,
      baselinePrep.totalPrepMinutes,
      0
    );

    res.json({
      currentTimeMinutes: db.currentTimeMinutes,
      parallelPrepStations: db.kitchenConfig.parallelPrepStations,
      activeQueuedCount,
      readyCount,
      peakCrowdCutPercent: analytics.peakCrowdCutPercent,
      avgMinutesSaved: analytics.avgMinutesSaved,
      slotEvaluations: slotEval.evaluations.map((ev) => ({
        ...ev,
        assignedTokens: [], // Omit order tokens on public endpoint
      })),
    });
  });

  // --- Separate Student & Admin Auth Routes ---

  app.post('/api/auth/student/register', (req, res) => {
    const { name, email, rollNumber, department, password } = req.body ?? {};
    const cleanName = typeof name === 'string' ? name.trim() : '';
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const cleanRoll = typeof rollNumber === 'string' ? rollNumber.trim().toUpperCase() : '';
    const cleanDept = typeof department === 'string' ? department.trim() : 'General Studies';
    const rawPassword = typeof password === 'string' ? password : '';

    if (!cleanName || !cleanEmail || !cleanRoll || rawPassword.length < 6) {
      res.status(400).json({
        error:
          'Please provide full name, campus email, roll number, and a password (min 6 characters).',
      });
      return;
    }

    const emailTaken = db.users.some((u) => u.email.toLowerCase() === cleanEmail);
    if (emailTaken) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const rollTaken = db.users.some(
      (u) => u.rollNumber && u.rollNumber.toUpperCase() === cleanRoll
    );
    if (rollTaken) {
      res.status(409).json({ error: 'This student roll number is already registered.' });
      return;
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const newUser: StoredUser = {
      id: `stu_${crypto.randomBytes(6).toString('hex')}`,
      role: 'student',
      name: cleanName,
      email: cleanEmail,
      rollNumber: cleanRoll,
      department: cleanDept || 'Undergraduate',
      salt,
      passwordHash: hashPassword(rawPassword, salt),
    };

    db.users.push(newUser);
    const token = createSessionForUser(newUser.id);

    res.status(201).json({
      token,
      user: toPublicUser(newUser),
    });
  });

  app.post('/api/auth/student/login', (req, res) => {
    const { identifier, password } = req.body ?? {};
    const cleanId =
      typeof identifier === 'string' ? identifier.trim().toLowerCase() : '';
    const rawPassword = typeof password === 'string' ? password : '';

    if (!cleanId || !rawPassword) {
      res.status(400).json({ error: 'Enter your campus email or roll number and password.' });
      return;
    }

    const user = db.users.find(
      (u) =>
        u.email.toLowerCase() === cleanId ||
        (u.rollNumber && u.rollNumber.toLowerCase() === cleanId)
    );

    if (!user || !verifyPassword(rawPassword, user.salt, user.passwordHash)) {
      res.status(401).json({ error: 'Invalid student credentials.' });
      return;
    }

    if (user.role !== 'student') {
      res.status(403).json({
        error:
          'This account belongs to Canteen Staff. Please sign in through the Canteen Admin Login.',
      });
      return;
    }

    const token = createSessionForUser(user.id);
    res.json({ token, user: toPublicUser(user) });
  });

  app.post('/api/auth/admin/login', (req, res) => {
    const { identifier, password } = req.body ?? {};
    const cleanId =
      typeof identifier === 'string' ? identifier.trim().toLowerCase() : '';
    const rawPassword = typeof password === 'string' ? password : '';

    if (!cleanId || !rawPassword) {
      res.status(400).json({ error: 'Enter your Staff ID or email and password.' });
      return;
    }

    const user = db.users.find(
      (u) =>
        u.email.toLowerCase() === cleanId ||
        (u.staffId && u.staffId.toLowerCase() === cleanId)
    );

    if (!user || !verifyPassword(rawPassword, user.salt, user.passwordHash)) {
      res.status(401).json({ error: 'Invalid canteen admin credentials.' });
      return;
    }

    if (user.role !== 'admin') {
      res.status(403).json({
        error:
          'Student accounts cannot access the Canteen Admin Console. Please use the Student Login.',
      });
      return;
    }

    const token = createSessionForUser(user.id);
    res.json({ token, user: toPublicUser(user) });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({ user: req.authUser });
  });

  app.post('/api/auth/logout', requireAuth, (req: AuthenticatedRequest, res) => {
    db.sessions = db.sessions.filter((s) => s.token !== req.authToken);
    saveDatabase(db);
    res.json({ ok: true });
  });

  // --- SSE Real-Time Sync Stream ---
  app.get('/api/events', (req, res) => {
    const token = getBearerToken(req);
    const user = resolveAuthUser(token);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    res.write(`event: connected\ndata: ${JSON.stringify({ role: user.role })}\n\n`);

    sseClients.add(res);
    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  // --- Authenticated Canteen State ---
  app.get('/api/canteen/state', requireAuth, (req: AuthenticatedRequest, res) => {
    res.json(buildStatePayloadForUser(req.authUser!));
  });

  // --- Student Order Placement (Server-Authoritative Smart Queue Validation) ---
  app.post(
    '/api/orders',
    requireAuth,
    requireRole('student'),
    (req: AuthenticatedRequest, res) => {
      const { items, slotId, kitchenNote } = req.body ?? {};
      const cartItems = Array.isArray(items) ? (items as CartItem[]) : [];

      if (cartItems.length === 0) {
        res.status(400).json({ error: 'Your tray is empty.' });
        return;
      }

      const menuMap = new Map(db.menu.map((m) => [m.id, m]));
      for (const entry of cartItems) {
        const dish = menuMap.get(entry.menuItemId);
        if (!dish || !dish.isAvailable || dish.stock < entry.quantity || entry.quantity <= 0) {
          res.status(409).json({
            error: `${dish?.name ?? 'Item'} does not have enough stock remaining.`,
          });
          return;
        }
      }

      const activeQueuedCount = getActiveQueuedOrdersCount(db.orders);
      const prepBreakdown = calculatePrepBreakdown(
        cartItems,
        menuMap,
        activeQueuedCount,
        db.kitchenConfig.parallelPrepStations
      );

      const slotEval = evaluateSlots(
        db.slots,
        db.orders,
        db.currentTimeMinutes,
        prepBreakdown.totalPrepMinutes,
        prepBreakdown.cartWorkloadPoints
      ).evaluations.find((ev) => ev.slot.id === slotId);

      if (!slotEval || !slotEval.isBookable) {
        res.status(409).json({
          error:
            slotEval?.reason ||
            'Selected pickup window is no longer available. Please choose another window.',
        });
        return;
      }

      const maxNum = db.orders.reduce((max, o) => {
        const n = parseInt(o.token.replace(/\D/g, ''), 10);
        return Number.isFinite(n) ? Math.max(max, n) : max;
      }, 112);

      const nextNum = maxNum + 1;
      const orderId = `ORD-${nextNum}`;
      const token = `QFC-${nextNum}`;
      const pin = String(crypto.randomInt(1000, 10000));

      const orderItems = cartItems
        .map((entry) => {
          const dish = menuMap.get(entry.menuItemId);
          if (!dish) return null;
          return {
            menuItemId: dish.id,
            name: dish.name,
            quantity: entry.quantity,
            unitPrice: dish.price,
            prepTimeMinutes: dish.prepTimeMinutes,
            workloadPoints: dish.workloadPoints,
            isVeg: dish.isVeg,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      const newOrder: Order = {
        id: orderId,
        token,
        pin,
        studentId: req.authUser!.id,
        studentName: req.authUser!.name,
        slotId: slotEval.slot.id,
        slotLabel: slotEval.slot.label,
        status: 'Received',
        items: orderItems,
        totalAmount: orderItems.reduce(
          (sum, item) => sum + item.unitPrice * item.quantity,
          0
        ),
        totalWorkloadPoints: orderItems.reduce(
          (sum, item) => sum + item.workloadPoints * item.quantity,
          0
        ),
        estimatedPrepMinutes: prepBreakdown.totalPrepMinutes,
        kitchenNote:
          typeof kitchenNote === 'string' && kitchenNote.trim()
            ? kitchenNote.trim().slice(0, 140)
            : undefined,
        counterLabel: nextNum % 2 === 0 ? 'Counter A' : 'Counter B',
        createdAtLabel: formatMinutesToClock(db.currentTimeMinutes),
        qrPayload: buildQrPayload(orderId, slotEval.slot.id, pin),
      };

      const qtyByDish = new Map(cartItems.map((c) => [c.menuItemId, c.quantity]));
      db.menu = db.menu.map((item) => {
        const orderedQty = qtyByDish.get(item.id) ?? 0;
        if (orderedQty === 0) return item;
        const nextStock = Math.max(0, item.stock - orderedQty);
        return {
          ...item,
          stock: nextStock,
          isAvailable: nextStock > 0 ? item.isAvailable : false,
        };
      });

      db.orders = [newOrder, ...db.orders];
      saveDatabase(db);
      broadcastStateUpdate();

      res.status(201).json({ order: newOrder });
    }
  );

  // --- Canteen Admin Routes ---

  app.patch(
    '/api/orders/:id/status',
    requireAuth,
    requireRole('admin'),
    (req, res) => {
      const { status } = req.body ?? {};
      const validStatuses: OrderStatus[] = [
        'Received',
        'Preparing',
        'Ready',
        'Collected',
      ];
      if (!validStatuses.includes(status)) {
        res.status(400).json({ error: 'Invalid order status.' });
        return;
      }

      const target = db.orders.find((o) => o.id === req.params.id);
      if (!target) {
        res.status(404).json({ error: 'Order not found.' });
        return;
      }

      target.status = status;
      saveDatabase(db);
      broadcastStateUpdate();
      res.json({ order: target });
    }
  );

  app.post(
    '/api/orders/simulate',
    requireAuth,
    requireRole('admin'),
    (_req, res) => {
      const availableDishes = db.menu.filter((m) => m.isAvailable && m.stock > 0);
      if (availableDishes.length === 0) {
        res.status(409).json({ error: 'No in-stock dishes available to simulate.' });
        return;
      }

      const firstDish =
        availableDishes[Math.floor(Math.random() * availableDishes.length)];
      const secondDish =
        Math.random() > 0.45
          ? availableDishes.find(
              (d) => d.id !== firstDish.id && d.category === 'Drinks & Coffee'
            )
          : undefined;

      const simCart: CartItem[] = [
        { menuItemId: firstDish.id, quantity: 1 },
        ...(secondDish ? [{ menuItemId: secondDish.id, quantity: 1 }] : []),
      ];

      const menuMap = new Map(db.menu.map((m) => [m.id, m]));
      const activeQueuedCount = getActiveQueuedOrdersCount(db.orders);
      const simPrep = calculatePrepBreakdown(
        simCart,
        menuMap,
        activeQueuedCount,
        db.kitchenConfig.parallelPrepStations
      );
      const simSlots = evaluateSlots(
        db.slots,
        db.orders,
        db.currentTimeMinutes,
        simPrep.totalPrepMinutes,
        simPrep.cartWorkloadPoints
      );

      const targetEval =
        simSlots.evaluations.find((ev) => ev.isSmartPick) ??
        simSlots.evaluations.find((ev) => ev.isBookable);

      if (!targetEval) {
        res.status(409).json({
          error: 'All open pickup windows are at capacity.',
        });
        return;
      }

      const maxNum = db.orders.reduce((max, o) => {
        const n = parseInt(o.token.replace(/\D/g, ''), 10);
        return Number.isFinite(n) ? Math.max(max, n) : max;
      }, 112);

      const nextNum = maxNum + 1;
      const orderId = `ORD-${nextNum}`;
      const token = `QFC-${nextNum}`;
      const pin = String(crypto.randomInt(1000, 10000));
      const studentUsers = db.users.filter((u) => u.role === 'student');
      const student =
        studentUsers[nextNum % studentUsers.length] ?? {
          id: 'stu_maya',
          name: 'Maya Lin',
        };

      const orderItems = simCart
        .map((entry) => {
          const d = menuMap.get(entry.menuItemId);
          if (!d) return null;
          return {
            menuItemId: d.id,
            name: d.name,
            quantity: entry.quantity,
            unitPrice: d.price,
            prepTimeMinutes: d.prepTimeMinutes,
            workloadPoints: d.workloadPoints,
            isVeg: d.isVeg,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      const simulatedOrder: Order = {
        id: orderId,
        token,
        pin,
        studentId: student.id,
        studentName: student.name,
        slotId: targetEval.slot.id,
        slotLabel: targetEval.slot.label,
        status: 'Received',
        items: orderItems,
        totalAmount: orderItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
        totalWorkloadPoints: orderItems.reduce(
          (s, i) => s + i.workloadPoints * i.quantity,
          0
        ),
        estimatedPrepMinutes: simPrep.totalPrepMinutes,
        counterLabel: nextNum % 2 === 0 ? 'Counter A' : 'Counter B',
        createdAtLabel: formatMinutesToClock(db.currentTimeMinutes),
        qrPayload: buildQrPayload(orderId, targetEval.slot.id, pin),
      };

      db.menu = db.menu.map((m) => {
        const hit = simCart.find((c) => c.menuItemId === m.id);
        if (!hit) return m;
        const nextStock = Math.max(0, m.stock - hit.quantity);
        return {
          ...m,
          stock: nextStock,
          isAvailable: nextStock > 0 ? m.isAvailable : false,
        };
      });

      db.orders = [simulatedOrder, ...db.orders];
      saveDatabase(db);
      broadcastStateUpdate();
      res.status(201).json({ order: simulatedOrder });
    }
  );

  app.post(
    '/api/orders/verify',
    requireAuth,
    requireRole('admin'),
    (req, res) => {
      const { query } = req.body ?? {};
      const result = parseVerificationQuery(
        typeof query === 'string' ? query : '',
        db.orders
      );
      res.json(result);
    }
  );

  app.post(
    '/api/orders/:id/collect',
    requireAuth,
    requireRole('admin'),
    (req, res) => {
      const target = db.orders.find((o) => o.id === req.params.id);
      if (!target) {
        res.status(404).json({ error: 'Order not found.' });
        return;
      }
      target.status = 'Collected';
      saveDatabase(db);
      broadcastStateUpdate();
      res.json({ order: target });
    }
  );

  app.post('/api/menu', requireAuth, requireRole('admin'), (req, res) => {
    const body = req.body ?? {};
    const validCategories: MenuCategory[] = [
      'Bowls & Meals',
      'Wraps & Sandwiches',
      'Snacks & Sides',
      'Drinks & Coffee',
    ];
    const stock = Math.max(0, Number(body.stock) || 0);
    const newItem: MenuItem = {
      id: `dish_${Date.now()}`,
      name: String(body.name || 'Campus Special').trim(),
      description: String(
        body.description || 'Freshly prepared to order at the campus kitchen.'
      ).trim(),
      category: validCategories.includes(body.category)
        ? body.category
        : 'Bowls & Meals',
      price: Math.max(10, Math.round(Number(body.price) || 100)),
      calories: Math.max(50, Math.round(Number(body.calories) || 350)),
      prepTimeMinutes: Math.max(1, Math.round(Number(body.prepTimeMinutes) || 5)),
      workloadPoints: Math.max(1, Math.round(Number(body.workloadPoints) || 4)),
      stock,
      isVeg: Boolean(body.isVeg),
      isAvailable: stock > 0,
      popular: Boolean(body.popular),
      imageUrl: String(body.imageUrl || db.menu[0]?.imageUrl || ''),
    };

    db.menu = [newItem, ...db.menu];
    saveDatabase(db);
    broadcastStateUpdate();
    res.status(201).json({ item: newItem });
  });

  app.patch('/api/menu/:id', requireAuth, requireRole('admin'), (req, res) => {
    const idx = db.menu.findIndex((m) => m.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Dish not found.' });
      return;
    }

    const current = db.menu[idx];
    const body = req.body ?? {};
    let next = { ...current };

    if (body.toggleStock) {
      const nextAvail = !current.isAvailable;
      next = {
        ...current,
        isAvailable: nextAvail,
        stock: nextAvail && current.stock === 0 ? 10 : current.stock,
      };
    } else if (typeof body.stockDelta === 'number') {
      const nextStock = Math.max(0, current.stock + body.stockDelta);
      next = {
        ...current,
        stock: nextStock,
        isAvailable:
          nextStock > 0
            ? body.stockDelta > 0
              ? true
              : current.isAvailable
            : false,
      };
    } else {
      const nextStock =
        typeof body.stock === 'number'
          ? Math.max(0, body.stock)
          : current.stock;
      next = {
        ...current,
        name: typeof body.name === 'string' ? body.name.trim() : current.name,
        description:
          typeof body.description === 'string'
            ? body.description.trim()
            : current.description,
        category: body.category ?? current.category,
        price:
          typeof body.price === 'number'
            ? Math.max(10, Math.round(body.price))
            : current.price,
        calories:
          typeof body.calories === 'number'
            ? Math.max(50, Math.round(body.calories))
            : current.calories,
        prepTimeMinutes:
          typeof body.prepTimeMinutes === 'number'
            ? Math.max(1, Math.round(body.prepTimeMinutes))
            : current.prepTimeMinutes,
        workloadPoints:
          typeof body.workloadPoints === 'number'
            ? Math.max(1, Math.round(body.workloadPoints))
            : current.workloadPoints,
        stock: nextStock,
        isVeg: typeof body.isVeg === 'boolean' ? body.isVeg : current.isVeg,
        isAvailable:
          nextStock > 0 &&
          (typeof body.isAvailable === 'boolean'
            ? body.isAvailable
            : current.isAvailable),
      };
    }

    db.menu[idx] = next;
    saveDatabase(db);
    broadcastStateUpdate();
    res.json({ item: next });
  });

  app.patch(
    '/api/kitchen-config',
    requireAuth,
    requireRole('admin'),
    (req, res) => {
      const patch = req.body ?? {};
      db.kitchenConfig = {
        parallelPrepStations: Math.min(
          6,
          Math.max(
            1,
            Number(
              patch.parallelPrepStations ?? db.kitchenConfig.parallelPrepStations
            )
          )
        ),
        defaultMaxOrdersPerSlot: Math.min(
          20,
          Math.max(
            1,
            Number(
              patch.defaultMaxOrdersPerSlot ??
                db.kitchenConfig.defaultMaxOrdersPerSlot
            )
          )
        ),
        defaultMaxWorkloadPointsPerSlot: Math.min(
          100,
          Math.max(
            10,
            Number(
              patch.defaultMaxWorkloadPointsPerSlot ??
                db.kitchenConfig.defaultMaxWorkloadPointsPerSlot
            )
          )
        ),
      };
      saveDatabase(db);
      broadcastStateUpdate();
      res.json({ kitchenConfig: db.kitchenConfig });
    }
  );

  app.post(
    '/api/kitchen-config/apply-defaults',
    requireAuth,
    requireRole('admin'),
    (_req, res) => {
      db.slots = db.slots.map((slot) => ({
        ...slot,
        maxOrders: db.kitchenConfig.defaultMaxOrdersPerSlot,
        maxWorkloadPoints: db.kitchenConfig.defaultMaxWorkloadPointsPerSlot,
      }));
      saveDatabase(db);
      broadcastStateUpdate();
      res.json({ slots: db.slots });
    }
  );

  app.patch('/api/slots/:id', requireAuth, requireRole('admin'), (req, res) => {
    const idx = db.slots.findIndex((s) => s.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Slot not found.' });
      return;
    }

    const current = db.slots[idx];
    const body = req.body ?? {};
    let next = { ...current };

    if (body.togglePaused) {
      next.isPaused = !current.isPaused;
    }
    if (typeof body.maxOrdersDelta === 'number') {
      next.maxOrders = Math.min(20, Math.max(1, current.maxOrders + body.maxOrdersDelta));
    }
    if (typeof body.maxWorkloadDelta === 'number') {
      next.maxWorkloadPoints = Math.min(
        120,
        Math.max(10, current.maxWorkloadPoints + body.maxWorkloadDelta)
      );
    }

    db.slots[idx] = next;
    saveDatabase(db);
    broadcastStateUpdate();
    res.json({ slot: next });
  });

  app.post('/api/clock/advance', requireAuth, requireRole('admin'), (_req, res) => {
    db.currentTimeMinutes =
      db.currentTimeMinutes >= 840 ? 728 : db.currentTimeMinutes + 15;
    saveDatabase(db);
    broadcastStateUpdate();
    res.json({ currentTimeMinutes: db.currentTimeMinutes });
  });

  app.post('/api/clock/reset', requireAuth, requireRole('admin'), (_req, res) => {
    const fresh = createInitialCanteenState();
    db.currentTimeMinutes = fresh.currentTimeMinutes;
    db.menu = fresh.menu;
    db.slots = fresh.slots;
    db.orders = fresh.orders;
    db.kitchenConfig = fresh.kitchenConfig;
    saveDatabase(db);
    broadcastStateUpdate();
    res.json({ ok: true });
  });

  // --- Vite / Static Frontend Serving ---
  let viteServer: Awaited<ReturnType<typeof createViteServer>> | null = null;
  if (process.env.NODE_ENV !== 'production') {
    viteServer = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });
    app.use(viteServer.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const PORT = 3000;
  const httpServer = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Queue-Free Canteen server running on http://0.0.0.0:${PORT}`);
  });

  const shutdown = () => {
    for (const client of sseClients) {
      try {
        client.end();
      } catch {
        // Ignore closed stream
      }
    }
    sseClients.clear();
    httpServer.close(() => {
      if (viteServer) {
        void viteServer.close().finally(() => process.exit(0));
      } else {
        process.exit(0);
      }
    });
    setTimeout(() => process.exit(0), 1000).unref();
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((err) => {
  console.error('Failed to start Queue-Free Canteen server:', err);
  process.exit(1);
});
