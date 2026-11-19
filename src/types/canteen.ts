export type AuthRole = 'student' | 'admin';

export type AuthScreen = 'landing' | 'student-login' | 'admin-login';

export type MenuCategory =
  | 'Bowls & Meals'
  | 'Wraps & Sandwiches'
  | 'Snacks & Sides'
  | 'Drinks & Coffee';

export type OrderStatus = 'Received' | 'Preparing' | 'Ready' | 'Collected';

export type SlotClassification =
  | 'Smart Pick'
  | 'Low Crowd'
  | 'Busy'
  | 'Slot Full'
  | 'Kitchen Cap'
  | 'Too Soon'
  | 'Paused';

export interface AuthUser {
  id: string;
  role: AuthRole;
  name: string;
  email: string;
  rollNumber?: string;
  department?: string;
  staffId?: string;
  station?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  category: MenuCategory;
  price: number;
  calories: number;
  prepTimeMinutes: number;
  workloadPoints: number;
  stock: number;
  isVeg: boolean;
  isAvailable: boolean;
  popular?: boolean;
  imageUrl: string;
}

export interface PickupSlot {
  id: string;
  label: string;
  shortLabel: string;
  startMinutes: number;
  endMinutes: number;
  maxOrders: number;
  maxWorkloadPoints: number;
  isPaused: boolean;
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  prepTimeMinutes: number;
  workloadPoints: number;
  isVeg: boolean;
}

export interface Order {
  id: string;
  token: string;
  pin: string;
  studentId: string;
  studentName: string;
  slotId: string;
  slotLabel: string;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  totalWorkloadPoints: number;
  estimatedPrepMinutes: number;
  kitchenNote?: string;
  counterLabel: string;
  createdAtLabel: string;
  qrPayload: string;
}

export interface StudentProfile {
  id: string;
  name: string;
  rollNumber: string;
  department: string;
}

export interface KitchenConfig {
  parallelPrepStations: number;
  defaultMaxOrdersPerSlot: number;
  defaultMaxWorkloadPointsPerSlot: number;
}

export interface CartItem {
  menuItemId: string;
  quantity: number;
}

export interface PrepBreakdown {
  baseMaxPrepMinutes: number;
  batchOverheadMinutes: number;
  backlogPenaltyMinutes: number;
  totalPrepMinutes: number;
  totalUnits: number;
  cartWorkloadPoints: number;
  activeQueuedOrders: number;
  parallelPrepStations: number;
}

export interface SlotOccupancy {
  slotId: string;
  orderCount: number;
  workloadPoints: number;
  assignedTokens: string[];
}

export interface SlotEvaluation {
  slot: PickupSlot;
  orderCount: number;
  workloadPoints: number;
  assignedTokens: string[];
  loadRatio: number;
  classification: SlotClassification;
  isBookable: boolean;
  reason: string;
  isSmartPick: boolean;
  smoothedFromBusy: boolean;
}

export interface PublicTelemetry {
  currentTimeMinutes: number;
  parallelPrepStations: number;
  activeQueuedCount: number;
  readyCount: number;
  peakCrowdCutPercent: number;
  avgMinutesSaved: number;
  slotEvaluations: SlotEvaluation[];
}

export interface ServerStatePayload {
  currentTimeMinutes: number;
  menu: MenuItem[];
  slots: PickupSlot[];
  orders: Order[];
  slotOccupancy: SlotOccupancy[];
  activeQueuedCount: number;
  kitchenConfig: KitchenConfig;
  analytics: {
    windowComparison: {
      slotId: string;
      shortLabel: string;
      label: string;
      smartOrdersCount: number;
      smartLoadPts: number;
      walkInOrdersCount: number;
      walkInWorkloadPts: number;
      maxWorkloadPoints: number;
    }[];
    peakCrowdCutPercent: number;
    totalRevenue: number;
    avgPrepTime: number;
    collectedCount: number;
    avgMinutesSaved: number;
  };
}

export interface CanteenState {
  currentTimeMinutes: number;
  activeStudentId: string;
  students: StudentProfile[];
  menu: MenuItem[];
  slots: PickupSlot[];
  orders: Order[];
  kitchenConfig: KitchenConfig;
  cart: CartItem[];
}
