import React, { createContext, useState, useContext } from "react";
import { Platform } from "react-native";
import axios from "axios";
import config from "../api/api";
import { getDeviceId } from "../utils/deviceId";

// Configure axios defaults
axios.defaults.timeout = 10000; // 10 second timeout
axios.defaults.headers.common["Content-Type"] = "application/json";

// Add response interceptor for better error handling
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === "ECONNABORTED") {
      console.error("Request timeout:", error.message);
      // Return a rejected promise with a more user-friendly error
      return Promise.reject(new Error("Request timed out. Please check your internet connection."));
    }
    if (!error.response) {
      console.error("Network error:", error.message);
      // Return a rejected promise with a more user-friendly error
      return Promise.reject(new Error("Network error. Please check your internet connection."));
    }
    return Promise.reject(error);
  }
);

interface OnboardingData {
  selectedSports: any[];
  notificationsEnabled: boolean;
  locationEnabled: boolean;
}

interface ScreenTiming {
  startTime?: number;
  endTime?: number;
  timeSpent?: number;
}

interface OnboardingStatus {
  hasCompleted: boolean;
  version: string | null;
  userRole: string | null;
  preferences: any;
}

export interface OnboardingContextValue {
  currentStep: number;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  onboardingData: OnboardingData;
  updateData: (key: keyof OnboardingData, value: any) => void;
  screenTimestamps: Record<string, ScreenTiming>;
  startScreenTimer: (screenName: string) => void;
  endScreenTimer: (screenName: string) => void;
  trackScreen: (userId: string | null | undefined, screenName: string) => Promise<void>;
  updateStep: (userId: string | null | undefined, stepName: string) => Promise<void>;
  updatePreferences: (userId: string | null | undefined, preferences: any) => Promise<void>;
  completeOnboarding: (userId?: string | null) => Promise<boolean>;
  skipOnboarding: (userId?: string | null) => Promise<boolean>;
  checkOnboardingStatus: (userId?: string | null) => Promise<OnboardingStatus>;
  onboardingCompleted: boolean;
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

export const useOnboarding = (): OnboardingContextValue => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
};

export const OnboardingProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    selectedSports: [],
    notificationsEnabled: false,
    locationEnabled: false,
  });
  const [screenTimestamps, setScreenTimestamps] = useState<Record<string, ScreenTiming>>({});
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  // Update onboarding data
  const updateData = (key: keyof OnboardingData, value: any) => {
    setOnboardingData((prev) => ({ ...prev, [key]: value }));
  };

  // Track screen view time
  const startScreenTimer = (screenName: string) => {
    setScreenTimestamps((prev) => ({
      ...prev,
      [screenName]: { startTime: Date.now() },
    }));
  };

  const endScreenTimer = (screenName: string) => {
    setScreenTimestamps((prev) => {
      const screenData = prev[screenName];
      if (!screenData || !screenData.startTime) return prev;

      const timeSpent = Math.floor((Date.now() - screenData.startTime) / 1000);

      return {
        ...prev,
        [screenName]: {
          ...screenData,
          endTime: Date.now(),
          timeSpent,
        },
      };
    });
  };

  // Track screen view on server
  const trackScreen = async (userId: string | null | undefined, screenName: string) => {
    try {
      const screenData = screenTimestamps[screenName];
      const timeSpent = screenData?.timeSpent || 0;
      const deviceId = await getDeviceId(); // ALWAYS get deviceId

      // Add timeout to prevent hanging requests
      await axios.post(`${config.BASE_URL}/onboarding/track-screen`, {
        deviceId,
        screenName,
        timeSpent,
      }, { timeout: 5000 });
    } catch (error) {
      console.error("Error tracking screen:", error);
      // Silently fail - tracking is not critical for app functionality
    }
  };

  // Update step on server
  const updateStep = async (userId: string | null | undefined, stepName: string) => {
    try {
      const screenData = screenTimestamps[stepName];
      const timeSpent = screenData?.timeSpent || 0;
      const deviceId = await getDeviceId(); // ALWAYS get deviceId

      // Add timeout to prevent hanging requests
      await axios.post(`${config.BASE_URL}/onboarding/update-step`, {
        deviceId,
        stepName,
        timeSpent,
      }, { timeout: 5000 });
    } catch (error) {
      console.error("Error updating step:", error);
      // Silently fail - step updates are not critical for app functionality
    }
  };

  // Update preferences on server
  const updatePreferences = async (userId: string | null | undefined, preferences: any) => {
    try {
      const deviceId = await getDeviceId(); // ALWAYS get deviceId

      // Add timeout to prevent hanging requests
      await axios.post(`${config.BASE_URL}/onboarding/update-preferences`, {
        deviceId,
        preferences,
      }, { timeout: 5000 });
    } catch (error) {
      console.error("Error updating preferences:", error);
      // Silently fail - preferences can be updated later
    }
  };

  // Complete onboarding
  const completeOnboarding = async (userId?: string | null): Promise<boolean> => {
    try {
      const deviceId = await getDeviceId(); // ALWAYS get deviceId

      // Update preferences first
      await updatePreferences(userId, onboardingData);

      // Mark as completed
      // Add timeout to prevent hanging requests
      const response = await axios.post(
        `${config.BASE_URL}/onboarding/complete`,
        {
          deviceId,
          deviceInfo: {
            platform: Platform.OS,
            appVersion: "1.0.0",
          },
        },
        { timeout: 10000 }
      );

      if (response.data.success) {
        setOnboardingCompleted(true);
      }

      return response.data.success;
    } catch (error) {
      console.error("Error completing onboarding:", error);

      // Still mark as completed locally so user can proceed
      setOnboardingCompleted(true);
      return true; // Return true to allow app to continue
    }
  };

  // Skip onboarding
  const skipOnboarding = async (_userId?: string | null): Promise<boolean> => {
    try {
      const deviceId = await getDeviceId(); // ALWAYS get deviceId

      // Add timeout to prevent hanging requests
      const response = await axios.post(
        `${config.BASE_URL}/onboarding/skip`,
        {
          deviceId,
        },
        { timeout: 10000 }
      );

      if (response.data.success) {
        setOnboardingCompleted(true);
      }

      return response.data.success;
    } catch (error) {
      console.error("Error skipping onboarding:", error);

      // Still mark as completed locally so user can proceed
      setOnboardingCompleted(true);
      return true; // Return true to allow app to continue
    }
  };

  // Check onboarding status
  const checkOnboardingStatus = async (userId?: string | null): Promise<OnboardingStatus> => {
    try {
      const deviceId = await getDeviceId(); // ALWAYS get deviceId
      const url = `${config.BASE_URL}/onboarding/status?deviceId=${deviceId}${userId ? `&userId=${userId}` : ""}`;

      // Add timeout to prevent hanging requests
      const response = await axios.get(url, { timeout: 10000 });

      return {
        hasCompleted: response.data.hasCompleted,
        version: response.data.version,
        userRole: response.data.userRole,
        preferences: response.data.preferences,
      };
    } catch (error) {
      console.error("Error checking onboarding status:", error);

      // Return default values to allow app to continue
      return {
        hasCompleted: false, // Assume not completed to show onboarding
        version: null,
        userRole: null,
        preferences: null,
      };
    }
  };

  const value: OnboardingContextValue = {
    currentStep,
    setCurrentStep,
    onboardingData,
    updateData,
    screenTimestamps,
    startScreenTimer,
    endScreenTimer,
    trackScreen,
    updateStep,
    updatePreferences,
    completeOnboarding,
    skipOnboarding,
    checkOnboardingStatus,
    onboardingCompleted,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

export default OnboardingContext;
