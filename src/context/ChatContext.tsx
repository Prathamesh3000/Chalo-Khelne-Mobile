import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import API from "../api/api";
import { authFetch } from "../api/authFetch";

export interface ChatContextValue {
  unreadTotal: number;
  setUnreadTotal: React.Dispatch<React.SetStateAction<number>>;
  fetchUnreadTotal: () => Promise<void>;
  decrementUnread: (count?: number) => void;
  getSocket: () => Socket | null;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export const useChat = (): ChatContextValue => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within ChatProvider");
  }
  return context;
};

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const { token, isAuthenticated } = useAuth();
  const [unreadTotal, setUnreadTotal] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const connectSocket = useCallback(() => {
    if (socketRef.current?.connected) return;

    try {
      const socket = io(API.SERVER_URL, {
        auth: { token },
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });

      socket.on("connect", () => {
        console.log("[CHAT] Socket connected");
      });

      socket.on("message:new", () => {
        setUnreadTotal((prev) => prev + 1);
      });

      socket.on("connect_error", (err) => {
        console.log("[CHAT] Socket error:", err.message);
      });

      socketRef.current = socket;
    } catch (err) {
      console.error("[CHAT] Socket connection failed:", err);
    }
  }, [token]);

  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  const fetchUnreadTotal = useCallback(async () => {
    if (!token) return;
    try {
      const response = await authFetch(`${API.BASE_URL}/chat/unread-total`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setUnreadTotal(data.total);
      }
    } catch (err) {
      console.error("[CHAT] Error fetching unread total:", err);
    }
  }, [token]);

  // Connect socket when authenticated
  useEffect(() => {
    if (!isAuthenticated || !token) {
      disconnectSocket();
      return;
    }

    connectSocket();
    fetchUnreadTotal();

    return () => {
      disconnectSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token]);

  // Handle app state changes — reconnect on foreground
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === "active") {
        if (isAuthenticated && token && !socketRef.current?.connected) {
          connectSocket();
          fetchUnreadTotal();
        }
      }
      appStateRef.current = nextState;
    });

    return () => sub?.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token]);

  const decrementUnread = useCallback((count = 1) => {
    setUnreadTotal((prev) => Math.max(0, prev - count));
  }, []);

  const getSocket = useCallback(() => socketRef.current, []);

  const value: ChatContextValue = {
    unreadTotal,
    setUnreadTotal,
    fetchUnreadTotal,
    decrementUnread,
    getSocket,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export default ChatContext;
