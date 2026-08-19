import { getToken } from "../services/tokenStore";
// api/PlayerPayment.ts â€” payment-proof submission and history.
//
// Â§2.5: this module previously pointed at `/player-payment/*`, a route prefix
// that DOES NOT EXIST on the server â€” nothing mounts it, and nothing in the app
// imported this module either. Both halves of the proof feature were written
// against each other and neither was connected: the server's uploadPaymentProof
// had no route, and the client's endpoints named a prefix that was never
// mounted. The manager's "Payment Reviews" screen could only ever be empty.
//
// The real routes live under /api/payments (routes/managerPaymentRoutes.js).

import API from "./api";

const { BASE_URL } = API;

const authHeaders = async (
  extra: Record<string, string> = {}
): Promise<Record<string, string>> => {
  const token = await getToken();
  return { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra };
};

const ENDPOINTS = {
  // Player submits payment proof (multipart/form-data).
  UPLOAD: `${BASE_URL}/payments/proofs`,

  // Manager's inbox of pending proofs.
  PENDING: (managerId: string) => `${BASE_URL}/payments/proofs/pending/${managerId}`,

  // Manager approves / rejects a proof.
  VERIFY: (paymentId: string) => `${BASE_URL}/payments/proofs/${paymentId}/verify`,

  HISTORY: {
    PLAYER: (playerId: string) => `${BASE_URL}/payments/proofs/history/${playerId}`,
    TOURNAMENT: (tournamentId: string) =>
      `${BASE_URL}/payments/proofs/tournament/${tournamentId}`,
  },
};

export interface UploadProofArgs {
  tournamentId: string;
  /** "qr" | "upi" | "offline" */
  paymentMethod: string;
  /** The reference the player typed. Required. */
  transactionId: string;
  /** Optional explicit link; the server resolves it from the booking otherwise. */
  bookingId?: string | null;
  managerPaymentOptionId?: string | null;
  /** Local file URI of the screenshot (required for qr/upi). */
  screenshotUri?: string | null;
  offlineReceiver?: { name?: string; contact?: string } | null;
}

/**
 * Submit a payment proof.
 *
 * NOTE what is deliberately NOT sent: playerId, managerId and amount. The
 * server derives the player from the token, the manager from the tournament,
 * and the amount from the linked booking. Sending them would be ignored.
 */
async function uploadProof(args: UploadProofArgs) {
  const form = new FormData();
  form.append("tournamentId", args.tournamentId);
  form.append("paymentMethod", args.paymentMethod);
  form.append("transactionId", args.transactionId);
  if (args.bookingId) form.append("bookingId", args.bookingId);
  if (args.managerPaymentOptionId) {
    form.append("managerPaymentOptionId", args.managerPaymentOptionId);
  }
  if (args.offlineReceiver) {
    form.append("offlineReceiver", JSON.stringify(args.offlineReceiver));
  }

  if (args.screenshotUri) {
    const uri = args.screenshotUri;
    const name = uri.split("/").pop() || "proof.jpg";
    // React Native infers a type of application/octet-stream when none is
    // given; the server accepts that for this field but derives the stored
    // extension from an allowlist, so a hostile filename cannot pick it.
    const match = /\.(\w+)$/.exec(name);
    const ext = (match ? match[1] : "jpg").toLowerCase();
    const type = ext === "png" ? "image/png" : "image/jpeg";
    // @ts-expect-error â€” RN's FormData accepts this file shape.
    form.append("screenshot", { uri, name, type });
  }

  const response = await fetch(ENDPOINTS.UPLOAD, {
    method: "POST",
    // Do NOT set Content-Type: RN must set the multipart boundary itself.
    headers: await authHeaders(),
    body: form,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Failed to submit payment proof");
  }
  return data;
}

async function getPlayerHistory(playerId: string) {
  const response = await fetch(ENDPOINTS.HISTORY.PLAYER(playerId), {
    headers: await authHeaders(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Failed to fetch payment history");
  return data;
}

export default {
  BASE_URL,
  ENDPOINTS,
  uploadProof,
  getPlayerHistory,
};
