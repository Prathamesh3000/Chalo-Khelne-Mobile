import API from "./api";

const { BASE_URL } = API as { BASE_URL: string };

const ENDPOINTS = {
  // Public
  LISTINGS: `${BASE_URL}/donations/listings`,
  LISTING_BY_ID: (id: string) => `${BASE_URL}/donations/listings/${id}`,
  VENDOR_CLICK: (id: string) => `${BASE_URL}/donations/vendor-click/${id}`,

  // Authenticated
  CREATE: `${BASE_URL}/donations/list`,
  UPDATE: (id: string) => `${BASE_URL}/donations/list/${id}`,
  WITHDRAW: (id: string) => `${BASE_URL}/donations/list/${id}`,
  MY_LISTINGS: `${BASE_URL}/donations/my-listings`,
  MY_CLAIMS: `${BASE_URL}/donations/my-claims`,
  CLAIM: (id: string) => `${BASE_URL}/donations/claim/${id}`,
  PAY: (id: string) => `${BASE_URL}/donations/claim/${id}/pay`,
  VERIFY: (id: string) => `${BASE_URL}/donations/claim/${id}/verify`,
};

export default {
  BASE_URL,
  ENDPOINTS,
};
