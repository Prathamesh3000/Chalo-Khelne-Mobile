import { getToken } from "../services/tokenStore";
import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from "react";
import { useAuth } from "./AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { io, Socket } from "socket.io-client";
import API from "../api/api";
import NOTIFICATIONS from "../api/notifications";

export interface AppNotification {
  _id: string;
  isRead?: boolean;
  [key: string]: any;
}

export interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  isNotificationsOpen: boolean;
  toggleNotifications: () => void;
  closeNotifications: () => void;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  handleReceivedNotification: (notification?: any) => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const useNotifications = (): NotificationContextValue =>
  useContext(NotificationContext) as NotificationContextValue;

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const userId = user?._id || user?.id;
  // Club-staff (Manager / trainer / coach) accounts aren't in the User
  // collection and have no player notifications â€” skip the whole flow for them
  // (the User-scoped endpoints would 401).
  const isStaff = String(user?.role || "") === "Manager";

  // â”€â”€ Connect socket + listen for real-time notifications â”€â”€
  useEffect(() => {
    if (!userId || isStaff) return;

    const connectSocket = async () => {
      // Context state is not populated yet on app start, so fall back to the
      // stored token. The old third fallback — AsyncStorage("auth_token") — was
      // dead: tokenStore migrated the token to SecureStore and deleted the
      // plaintext copy, so it could only ever return null.
      const authToken = token || (await getToken());
      if (!authToken) return;

      const socket = io(API.SERVER_URL, {
        auth: { token: authToken },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 15,
        reconnectionDelay: 3000,
      });

      socket.on("connect", () => {
        console.log("[NOTIF_SOCKET] Connected");
      });

      // Listen for new notifications (from playerNotify utility)
      socket.on("notification:new", (data: any) => {
        setNotifications((prev) => [{ ...data, isRead: false }, ...prev]);
        setUnreadCount((prev) => prev + 1);
      });

      socket.on("connect_error", (err) => {
        console.log("[NOTIF_SOCKET] Error:", err.message);
      });

      socketRef.current = socket;
    };

    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [userId, token, isStaff]);

  // â”€â”€ Fetch notifications from API â”€â”€
  // Use bare axios so it carries the global Authorization header set on login;
  // AsyncStorage("auth_token") is null (the token lives in SecureStore).
  const fetchNotifications = useCallback(async () => {
    if (!userId || isStaff) return;
    try {
      const res = await axios.get(NOTIFICATIONS.GET_ALL(userId));
      if (res.data.success) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err: any) {
      console.error("[NOTIF] Fetch error:", err.message);
    }
  }, [userId, isStaff]);

  // â”€â”€ Fetch unread count â”€â”€
  const fetchUnreadCount = useCallback(async () => {
    if (!userId || isStaff) return;
    try {
      const res = await axios.get(NOTIFICATIONS.UNREAD_COUNT(userId));
      if (res.data.success) {
        setUnreadCount(res.data.count);
      }
    } catch {}
  }, [userId, isStaff]);

  // â”€â”€ Initial fetch + polling â”€â”€
  useEffect(() => {
    if (userId) {
      fetchNotifications();

      // Poll every 60 seconds as backup to socket
      const interval = setInterval(fetchUnreadCount, 60000);
      return () => clearInterval(interval);
    }
  }, [userId, fetchNotifications, fetchUnreadCount]);

  // â”€â”€ Toggle notification panel â”€â”€
  const toggleNotifications = useCallback(() => {
    if (!isNotificationsOpen) fetchNotifications();
    setIsNotificationsOpen((prev) => !prev);
  }, [isNotificationsOpen, fetchNotifications]);

  const closeNotifications = useCallback(() => setIsNotificationsOpen(false), []);

  // â”€â”€ Mark single as read â”€â”€
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      // Bare axios carries the global Authorization header (set in AuthContext).
      await axios.put(NOTIFICATIONS.MARK_READ(notificationId), {});
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      console.error("[NOTIF] Mark read error:", err.message);
    }
  }, []);

  // â”€â”€ Mark all as read â”€â”€
  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    try {
      await axios.put(NOTIFICATIONS.MARK_ALL_READ(userId), {});
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err: any) {
      console.error("[NOTIF] Mark all read error:", err.message);
    }
  }, [userId]);

  // â”€â”€ Handle push notification received in foreground â”€â”€
  const handleReceivedNotification = useCallback((_notification?: any) => {
    setUnreadCount((prev) => prev + 1);
    if (isNotificationsOpen) fetchNotifications();
  }, [isNotificationsOpen, fetchNotifications]);

  // Memoized so consumers of useNotifications() don't re-render on every
  // provider render â€” only when a real value changes.
  const value = React.useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount,
      isNotificationsOpen,
      toggleNotifications,
      closeNotifications,
      markAsRead,
      markAllAsRead,
      fetchNotifications,
      handleReceivedNotification,
    }),
    [
      notifications,
      unreadCount,
      isNotificationsOpen,
      toggleNotifications,
      closeNotifications,
      markAsRead,
      markAllAsRead,
      fetchNotifications,
      handleReceivedNotification,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
