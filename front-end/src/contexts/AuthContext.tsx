import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

import {
  getCurrentUser,
  loginDoctor,
  registerDoctor,
  updateCurrentUserProfile,
  type ApiUser,
  type UpdateCurrentUserPayload,
} from "@/lib/authApi";

interface User {
  id: string;
  email: string;
  fullName: string;
  specialty?: string | null;
  hospital?: string | null;
  profileImage?: string;
}

interface Session {
  user: User | null;
  accessToken: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfile: (profileData: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const USER_STORAGE_KEY = "neuroscan_user";
const TOKEN_STORAGE_KEY = "neuroscan_access_token";

const readStoredUser = (): User | null => {
  const storedUser = localStorage.getItem(USER_STORAGE_KEY);
  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser) as User;
  } catch {
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
};

const mapApiUser = (apiUser: ApiUser, storedUser?: User | null): User => ({
  id: apiUser.id,
  email: apiUser.email,
  fullName: apiUser.fullName,
  specialty: apiUser.specialty ?? null,
  hospital: apiUser.hospital ?? null,
  profileImage: apiUser.avatarUrl ?? storedUser?.profileImage,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const applySession = (nextUser: User, accessToken: string) => {
    setUser(nextUser);
    setSession({ user: nextUser, accessToken });
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
    localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
  };

  const clearSession = () => {
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    // Wipe all MRI images stored for this session so they are not accessible after logout
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith("neuroscan_scan_image_"))
      .forEach((k) => sessionStorage.removeItem(k));
    sessionStorage.removeItem("neuroscan_latest_analysis_id");
    setUser(null);
    setSession(null);
  };

  useEffect(() => {
    let isMounted = true;

    const bootstrapSession = async () => {
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      const storedUser = readStoredUser();

      if (!storedToken) {
        if (storedUser) {
          localStorage.removeItem(USER_STORAGE_KEY);
        }
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      try {
        const currentUser = await getCurrentUser(storedToken);
        if (!isMounted) {
          return;
        }
        applySession(mapApiUser(currentUser, storedUser), storedToken);
      } catch {
        if (!isMounted) {
          return;
        }
        clearSession();
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void bootstrapSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const response = await registerDoctor(email, password, fullName);
    applySession(mapApiUser(response.user, readStoredUser()), response.accessToken);
  };

  const signIn = async (email: string, password: string) => {
    const response = await loginDoctor(email, password);
    applySession(mapApiUser(response.user, readStoredUser()), response.accessToken);
  };

  const signOut = async () => {
    clearSession();
  };

  const updateUserProfile = async (profileData: Partial<User>) => {
    if (!user) {
      return;
    }

    const accessToken = session?.accessToken || localStorage.getItem(TOKEN_STORAGE_KEY);
    let updatedUser: User = { ...user };
    const payload: UpdateCurrentUserPayload = {};

    if (profileData.fullName !== undefined) {
      payload.fullName = profileData.fullName;
    }
    if (profileData.specialty !== undefined) {
      payload.specialty = profileData.specialty ?? null;
    }
    if (profileData.hospital !== undefined) {
      payload.hospital = profileData.hospital ?? null;
    }

    if (accessToken && Object.keys(payload).length > 0) {
      const response = await updateCurrentUserProfile(accessToken, payload);
      updatedUser = mapApiUser(response, updatedUser);
    }

    if (profileData.profileImage !== undefined) {
      updatedUser.profileImage = profileData.profileImage;
    }

    setUser(updatedUser);
    setSession((currentSession) => ({
      user: updatedUser,
      accessToken: currentSession?.accessToken || accessToken || null,
    }));
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signUp,
        signIn,
        signOut,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
