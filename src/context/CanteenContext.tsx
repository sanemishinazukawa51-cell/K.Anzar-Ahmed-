import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  calculatePrepBreakdown,
  evaluateSlotsFromOccupancy,
} from '../engine/queueEngine';
import {
  AuthUser,
  CartItem,
  KitchenConfig,
  MenuItem,
  Order,
  OrderStatus,
  PrepBreakdown,
  PublicTelemetry,
  ServerStatePayload,
  SlotEvaluation,
} from '../types/canteen';

const TOKEN_STORAGE_KEY = 'qfc_auth_token';
const CART_STORAGE_KEY = 'qfc_student_cart';

interface AuthResult {
  ok: boolean;
  user?: AuthUser;
  error?: string;
}

interface PlaceOrderResult {
  ok: boolean;
  order?: Order;
  error?: string;
}

interface VerificationResult {
  status: 'VALID' | 'ALREADY_COLLECTED' | 'NOT_FOUND';
  order: Order | null;
}

interface CanteenContextValue {
  authUser: AuthUser | null;
  authLoading: boolean;
  publicTelemetry: PublicTelemetry | null;
  serverState: ServerStatePayload | null;
  menuMap: Map<string, MenuItem>;
  prepBreakdown: PrepBreakdown;
  slotEvaluations: SlotEvaluation[];
  smartPickSlotId: string | null;
  nextAvailableSlotId: string | null;
  hasBlockedEarlierSlots: boolean;
  cart: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  loginStudent: (identifier: string, password: string) => Promise<AuthResult>;
  registerStudent: (payload: {
    name: string;
    email: string;
    rollNumber: string;
    department: string;
    password: string;
  }) => Promise<AuthResult>;
  loginAdmin: (identifier: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  refreshState: () => Promise<void>;
  addToCart: (menuItemId: string) => void;
  updateCartQty: (menuItemId: string, delta: number) => void;
  clearCart: () => void;
  placeOrder: (slotId: string, kitchenNote?: string) => Promise<PlaceOrderResult>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  simulateIncomingOrder: () => Promise<{ ok: boolean; order?: Order; error?: string }>;
  verifyQrQuery: (query: string) => Promise<VerificationResult>;
  verifyAndCollectOrder: (orderId: string) => Promise<void>;
  toggleItemInStock: (menuItemId: string) => Promise<void>;
  adjustItemStock: (menuItemId: string, delta: number) => Promise<void>;
  saveMenuItem: (item: MenuItem) => Promise<void>;
  addMenuItem: (item: Omit<MenuItem, 'id'>) => Promise<void>;
  updateKitchenConfig: (patch: Partial<KitchenConfig>) => Promise<void>;
  applyDefaultsToAllSlots: () => Promise<void>;
  toggleSlotPaused: (slotId: string) => Promise<void>;
  adjustSlotCapacity: (
    slotId: string,
    field: 'maxOrders' | 'maxWorkloadPoints',
    delta: number
  ) => Promise<void>;
  advanceClock15m: () => Promise<void>;
  resetServiceData: () => Promise<void>;
}

const CanteenContext = createContext<CanteenContextValue | null>(null);

function getStoredToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function setStoredToken(token: string | null) {
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

function loadCart(): CartItem[] {
  try {
    const raw = sessionStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CanteenProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [publicTelemetry, setPublicTelemetry] = useState<PublicTelemetry | null>(
    null
  );
  const [serverState, setServerState] = useState<ServerStatePayload | null>(null);
  const [cart, setCart] = useState<CartItem[]>(() => loadCart());

  useEffect(() => {
    try {
      sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Ignore
    }
  }, [cart]);

  const apiFetch = useCallback(
    async (url: string, options: RequestInit = {}, overrideToken?: string) => {
      const activeToken = overrideToken ?? token;
      const headers = new Headers(options.headers);
      if (options.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      if (activeToken) {
        headers.set('Authorization', `Bearer ${activeToken}`);
      }
      const res = await fetch(url, { ...options, headers });
      return res;
    },
    [token]
  );

  const fetchPublicTelemetry = useCallback(async () => {
    try {
      const res = await fetch('/api/canteen/public-telemetry');
      if (res.ok) {
        const data = (await res.json()) as PublicTelemetry;
        setPublicTelemetry(data);
      }
    } catch {
      // Ignore transient errors
    }
  }, []);

  const refreshState = useCallback(
    async (overrideToken?: string) => {
      const activeToken = overrideToken ?? token;
      if (!activeToken) return;
      try {
        const res = await apiFetch('/api/canteen/state', {}, activeToken);
        if (res.status === 401) {
          setStoredToken(null);
          setToken(null);
          setAuthUser(null);
          setServerState(null);
          return;
        }
        if (res.ok) {
          const data = (await res.json()) as ServerStatePayload;
          setServerState(data);
        }
      } catch {
        // Ignore transient network errors
      }
    },
    [apiFetch, token]
  );

  // Bootstrap session on mount
  useEffect(() => {
    let active = true;
    const init = async () => {
      await fetchPublicTelemetry();
      const existingToken = getStoredToken();
      if (!existingToken) {
        if (active) setAuthLoading(false);
        return;
      }
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${existingToken}` },
        });
        if (!res.ok) {
          setStoredToken(null);
          if (active) {
            setToken(null);
            setAuthUser(null);
            setAuthLoading(false);
          }
          return;
        }
        const data = (await res.json()) as { user: AuthUser };
        if (active) {
          setAuthUser(data.user);
          await refreshState(existingToken);
          setAuthLoading(false);
        }
      } catch {
        if (active) setAuthLoading(false);
      }
    };
    init();
    return () => {
      active = false;
    };
  }, [fetchPublicTelemetry, refreshState]);

  // Real-time SSE sync when authenticated
  useEffect(() => {
    if (!token || !authUser) return;
    const es = new EventSource(`/api/events?token=${encodeURIComponent(token)}`);
    es.addEventListener('state_updated', () => {
      refreshState(token);
      fetchPublicTelemetry();
    });
    return () => {
      es.close();
    };
  }, [token, authUser, refreshState, fetchPublicTelemetry]);

  const loginStudent = async (
    identifier: string,
    password: string
  ): Promise<AuthResult> => {
    try {
      const res = await fetch('/api/auth/student/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Login failed.' };
      }
      setStoredToken(data.token);
      setToken(data.token);
      setAuthUser(data.user);
      await refreshState(data.token);
      return { ok: true, user: data.user };
    } catch {
      return { ok: false, error: 'Network error while signing in.' };
    }
  };

  const registerStudent = async (payload: {
    name: string;
    email: string;
    rollNumber: string;
    department: string;
    password: string;
  }): Promise<AuthResult> => {
    try {
      const res = await fetch('/api/auth/student/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Registration failed.' };
      }
      setStoredToken(data.token);
      setToken(data.token);
      setAuthUser(data.user);
      await refreshState(data.token);
      return { ok: true, user: data.user };
    } catch {
      return { ok: false, error: 'Network error during registration.' };
    }
  };

  const loginAdmin = async (
    identifier: string,
    password: string
  ): Promise<AuthResult> => {
    try {
      const res = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Admin login failed.' };
      }
      setStoredToken(data.token);
      setToken(data.token);
      setAuthUser(data.user);
      await refreshState(data.token);
      return { ok: true, user: data.user };
    } catch {
      return { ok: false, error: 'Network error while signing in.' };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await apiFetch('/api/auth/logout', { method: 'POST' });
      }
    } catch {
      // Ignore
    }
    setStoredToken(null);
    setToken(null);
    setAuthUser(null);
    setServerState(null);
    setCart([]);
    fetchPublicTelemetry();
  };

  const menuMap = useMemo(() => {
    const map = new Map<string, MenuItem>();
    for (const item of serverState?.menu ?? []) {
      map.set(item.id, item);
    }
    return map;
  }, [serverState?.menu]);

  const prepBreakdown = useMemo(
    () =>
      calculatePrepBreakdown(
        cart,
        menuMap,
        serverState?.activeQueuedCount ?? 0,
        serverState?.kitchenConfig.parallelPrepStations ?? 3
      ),
    [
      cart,
      menuMap,
      serverState?.activeQueuedCount,
      serverState?.kitchenConfig.parallelPrepStations,
    ]
  );

  const slotAnalysis = useMemo(() => {
    if (!serverState) {
      return {
        evaluations: [],
        smartPickSlotId: null,
        nextAvailableSlotId: null,
        hasBlockedEarlierSlots: false,
      };
    }
    return evaluateSlotsFromOccupancy(
      serverState.slots,
      serverState.slotOccupancy,
      serverState.currentTimeMinutes,
      prepBreakdown.totalPrepMinutes,
      prepBreakdown.cartWorkloadPoints
    );
  }, [
    serverState,
    prepBreakdown.totalPrepMinutes,
    prepBreakdown.cartWorkloadPoints,
  ]);

  const cartCount = useMemo(
    () => cart.reduce((sum, entry) => sum + entry.quantity, 0),
    [cart]
  );

  const cartSubtotal = useMemo(
    () =>
      cart.reduce((sum, entry) => {
        const item = menuMap.get(entry.menuItemId);
        return sum + (item ? item.price * entry.quantity : 0);
      }, 0),
    [cart, menuMap]
  );

  const addToCart = (menuItemId: string) => {
    const item = menuMap.get(menuItemId);
    if (!item || !item.isAvailable || item.stock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === menuItemId);
      const currentQty = existing?.quantity ?? 0;
      if (currentQty >= item.stock) return prev;
      if (existing) {
        return prev.map((c) =>
          c.menuItemId === menuItemId ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { menuItemId, quantity: 1 }];
    });
  };

  const updateCartQty = (menuItemId: string, delta: number) => {
    const item = menuMap.get(menuItemId);
    const maxStock = item ? item.stock : 99;
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.menuItemId !== menuItemId) return c;
          const nextQty = Math.min(maxStock, c.quantity + delta);
          return { ...c, quantity: nextQty };
        })
        .filter((c) => c.quantity > 0)
    );
  };

  const clearCart = () => setCart([]);

  const placeOrder = async (
    slotId: string,
    kitchenNote?: string
  ): Promise<PlaceOrderResult> => {
    try {
      const res = await apiFetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify({ items: cart, slotId, kitchenNote }),
      });
      const data = await res.json();
      if (!res.ok) {
        await refreshState();
        return { ok: false, error: data.error || 'Could not place order.' };
      }
      setCart([]);
      await refreshState();
      return { ok: true, order: data.order };
    } catch {
      return { ok: false, error: 'Network error placing order.' };
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    await apiFetch(`/api/orders/${encodeURIComponent(orderId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    await refreshState();
  };

  const simulateIncomingOrder = async () => {
    const res = await apiFetch('/api/orders/simulate', { method: 'POST' });
    const data = await res.json();
    await refreshState();
    if (!res.ok) {
      return { ok: false, error: data.error };
    }
    return { ok: true, order: data.order as Order };
  };

  const verifyQrQuery = async (query: string): Promise<VerificationResult> => {
    try {
      const res = await apiFetch('/api/orders/verify', {
        method: 'POST',
        body: JSON.stringify({ query }),
      });
      if (!res.ok) return { status: 'NOT_FOUND', order: null };
      return (await res.json()) as VerificationResult;
    } catch {
      return { status: 'NOT_FOUND', order: null };
    }
  };

  const verifyAndCollectOrder = async (orderId: string) => {
    await apiFetch(`/api/orders/${encodeURIComponent(orderId)}/collect`, {
      method: 'POST',
    });
    await refreshState();
  };

  const toggleItemInStock = async (menuItemId: string) => {
    await apiFetch(`/api/menu/${encodeURIComponent(menuItemId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ toggleStock: true }),
    });
    await refreshState();
  };

  const adjustItemStock = async (menuItemId: string, delta: number) => {
    await apiFetch(`/api/menu/${encodeURIComponent(menuItemId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ stockDelta: delta }),
    });
    await refreshState();
  };

  const saveMenuItem = async (item: MenuItem) => {
    await apiFetch(`/api/menu/${encodeURIComponent(item.id)}`, {
      method: 'PATCH',
      body: JSON.stringify(item),
    });
    await refreshState();
  };

  const addMenuItem = async (item: Omit<MenuItem, 'id'>) => {
    await apiFetch('/api/menu', {
      method: 'POST',
      body: JSON.stringify(item),
    });
    await refreshState();
  };

  const updateKitchenConfig = async (patch: Partial<KitchenConfig>) => {
    await apiFetch('/api/kitchen-config', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    await refreshState();
  };

  const applyDefaultsToAllSlots = async () => {
    await apiFetch('/api/kitchen-config/apply-defaults', { method: 'POST' });
    await refreshState();
  };

  const toggleSlotPaused = async (slotId: string) => {
    await apiFetch(`/api/slots/${encodeURIComponent(slotId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ togglePaused: true }),
    });
    await refreshState();
  };

  const adjustSlotCapacity = async (
    slotId: string,
    field: 'maxOrders' | 'maxWorkloadPoints',
    delta: number
  ) => {
    await apiFetch(`/api/slots/${encodeURIComponent(slotId)}`, {
      method: 'PATCH',
      body: JSON.stringify(
        field === 'maxOrders'
          ? { maxOrdersDelta: delta }
          : { maxWorkloadDelta: delta }
      ),
    });
    await refreshState();
  };

  const advanceClock15m = async () => {
    await apiFetch('/api/clock/advance', { method: 'POST' });
    await refreshState();
  };

  const resetServiceData = async () => {
    await apiFetch('/api/clock/reset', { method: 'POST' });
    await refreshState();
  };

  return (
    <CanteenContext.Provider
      value={{
        authUser,
        authLoading,
        publicTelemetry,
        serverState,
        menuMap,
        prepBreakdown,
        slotEvaluations: slotAnalysis.evaluations,
        smartPickSlotId: slotAnalysis.smartPickSlotId,
        nextAvailableSlotId: slotAnalysis.nextAvailableSlotId,
        hasBlockedEarlierSlots: slotAnalysis.hasBlockedEarlierSlots,
        cart,
        cartCount,
        cartSubtotal,
        loginStudent,
        registerStudent,
        loginAdmin,
        logout,
        refreshState: () => refreshState(),
        addToCart,
        updateCartQty,
        clearCart,
        placeOrder,
        updateOrderStatus,
        simulateIncomingOrder,
        verifyQrQuery,
        verifyAndCollectOrder,
        toggleItemInStock,
        adjustItemStock,
        saveMenuItem,
        addMenuItem,
        updateKitchenConfig,
        applyDefaultsToAllSlots,
        toggleSlotPaused,
        adjustSlotCapacity,
        advanceClock15m,
        resetServiceData,
      }}
    >
      {children}
    </CanteenContext.Provider>
  );
}

export function useCanteen() {
  const ctx = useContext(CanteenContext);
  if (!ctx) throw new Error('useCanteen must be used inside CanteenProvider');
  return ctx;
}
