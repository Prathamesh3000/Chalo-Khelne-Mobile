// cart.ts — local shopping cart persisted in AsyncStorage.
// (Phase 5 will move this into a typed Zustand store; typed here for now.)
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface CartItem {
  listingId: string;
  qty: number;
  [key: string]: unknown;
}

const KEY = "store_cart_v1";

const read = async (): Promise<CartItem[]> => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
};

const write = async (items: CartItem[]): Promise<CartItem[]> => {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
  return items;
};

export const getCart = read;

export const addToCart = async (item: Partial<CartItem> & { listingId: string }): Promise<CartItem[]> => {
  const cart = await read();
  if (cart.find((i) => i.listingId === item.listingId)) return cart;
  return write([...cart, { ...item, qty: item.qty || 1 } as CartItem]);
};

export const removeFromCart = async (listingId: string): Promise<CartItem[]> => {
  const cart = await read();
  return write(cart.filter((i) => i.listingId !== listingId));
};

export const updateQty = async (listingId: string, qty: number): Promise<CartItem[]> => {
  const cart = await read();
  const next = cart.map((i) =>
    i.listingId === listingId ? { ...i, qty: Math.max(1, qty) } : i
  );
  return write(next);
};

export const clearCart = async (): Promise<CartItem[]> => write([]);

export const isInCart = async (listingId: string): Promise<boolean> => {
  const cart = await read();
  return !!cart.find((i) => i.listingId === listingId);
};
