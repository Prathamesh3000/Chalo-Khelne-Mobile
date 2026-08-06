import API from "./api";
import { getToken } from "../services/tokenStore";

const { BASE_URL, Wbsite_SERVER_URL } = API;

// These helpers use raw fetch (not the axios instance), so they must attach the
// auth token themselves — otherwise the secured payment routes return 401.
const authHeaders = async (extra: Record<string, string> = {}): Promise<Record<string, string>> => {
  const token = await getToken();
  return { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra };
};

const ENDPOINTS = {
  QR_CODES: (managerId: string, tournamentId: string) =>
    `${BASE_URL}/payments/${managerId}/${tournamentId}/qr-codes`,
  UPI_IDS: (managerId: string, tournamentId: string) =>
    `${BASE_URL}/payments/${managerId}/${tournamentId}/upi-ids`,
  OFFLINE_PAYMENTS: (managerId: string, tournamentId: string) =>
    `${BASE_URL}/payments/${managerId}/${tournamentId}/offline`,
  NOTIFY: (managerId: string, tournamentId: string) =>
    `${BASE_URL}/payments/${managerId}/${tournamentId}/notify`,
  NOTIFICATIONS: (managerId: string) => `${BASE_URL}/payments/${managerId}/notifications`,
};

const managerPaymentAPI = {
  getQrCodes: async (managerId: string, tournamentId: string) => {
    try {
      const response = await fetch(ENDPOINTS.QR_CODES(managerId, tournamentId), { headers: await authHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to fetch QR codes");

      // Normalize imageUrl so it always starts with UPLOADS_URL
      const qrCodes = (data.qrCodes || []).map((qr: { imageUrl?: string }) => {
        const img = (qr?.imageUrl || "").replace(/\\/g, "/"); // fix backslashes
        const relativeAfterUploads = img.replace(/^\/?uploads\//i, ""); // remove leading uploads/
        const normalized = `${Wbsite_SERVER_URL}/uploads/${relativeAfterUploads}`;
        return { ...qr, imageUrl: normalized };
      });

      return { manager: data.manager || null, qrCodes };
    } catch (error) {
      console.error("Error fetching QR codes:", error);
      throw error;
    }
  },

  getUpiIds: async (managerId: string, tournamentId: string) => {
    try {
      const response = await fetch(ENDPOINTS.UPI_IDS(managerId, tournamentId), { headers: await authHeaders() });
      const data = await response.json();
      if (!response.ok) {
        if (data.message && data.message.toLowerCase().includes("no upi ids")) {
          return { manager: data.manager || null, upiIds: [] };
        }
        throw new Error(data.message || "Failed to fetch UPI IDs");
      }
      return { manager: data.manager || null, upiIds: data.upiIds || [] };
    } catch (error) {
      console.warn("No UPI IDs found or fetch failed:", error);
      return { manager: null, upiIds: [] };
    }
  },

  getOfflinePayments: async (managerId: string, tournamentId: string) => {
    try {
      const response = await fetch(ENDPOINTS.OFFLINE_PAYMENTS(managerId, tournamentId), { headers: await authHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to fetch offline payments");
      return { manager: data.manager || null, offlinePayments: data.offlinePayments || [] };
    } catch (error) {
      console.error("Error fetching offline payments:", error);
      throw error;
    }
  },

  notifyManager: async (managerId: string, tournamentId: string, payload: unknown) => {
    try {
      const response = await fetch(ENDPOINTS.NOTIFY(managerId, tournamentId), {
        method: "POST",
        headers: await authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to notify manager");
      return data;
    } catch (error) {
      console.error("Error notifying manager:", error);
      throw error;
    }
  },

  getNotifications: async (managerId: string) => {
    try {
      const response = await fetch(ENDPOINTS.NOTIFICATIONS(managerId), { headers: await authHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to fetch notifications");
      return data.notifications || [];
    } catch (error) {
      console.error("Error fetching notifications:", error);
      throw error;
    }
  },

  getAllPaymentMethods: async (managerId: string, tournamentId: string) => {
    const [qrRes, upiRes, offlineRes] = await Promise.all([
      managerPaymentAPI.getQrCodes(managerId, tournamentId).catch(() => ({ manager: null, qrCodes: [] })),
      managerPaymentAPI.getUpiIds(managerId, tournamentId).catch(() => ({ manager: null, upiIds: [] })),
      managerPaymentAPI.getOfflinePayments(managerId, tournamentId).catch(() => ({ manager: null, offlinePayments: [] })),
    ]);

    return {
      manager: qrRes.manager || upiRes.manager || offlineRes.manager || null,
      qrCodes: qrRes.qrCodes,
      upiIds: upiRes.upiIds,
      offlinePayments: offlineRes.offlinePayments,
      hasAnyMethod: qrRes.qrCodes.length > 0 || upiRes.upiIds.length > 0 || offlineRes.offlinePayments.length > 0,
    };
  },
};

export default {
  BASE_URL,
  ENDPOINTS,
  ...managerPaymentAPI,
};
