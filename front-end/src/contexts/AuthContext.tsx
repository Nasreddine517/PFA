import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface User {
  id: string;
  email: string;
  fullName: string;
  profileImage?: string;
}

interface Session {
  user: User | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfile: (profileData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const STORAGE_KEY = "neuroscan_user";
const ACCOUNTS_KEY = "neuroscan_accounts";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const u = JSON.parse(stored) as User;
        setUser(u);
        setSession({ user: u });
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const getAccounts = (): Record<string, { password: string; user: User }> => {
    try {
      return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "{}");
    } catch {
      return {};
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const accounts = getAccounts();
    if (accounts[email]) {
      throw new Error("Un compte avec cet email existe déjà.");
    }
    const newUser: User = {
      id: crypto.randomUUID(),
      email,
      fullName,
    };
    accounts[email] = { password, user: newUser };
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    setUser(newUser);
    setSession({ user: newUser });
  };

  const signIn = async (email: string, password: string) => {
    const accounts = getAccounts();
    const account = accounts[email];
    if (!account || account.password !== password) {
      throw new Error("Email ou mot de passe incorrect");
    }
    const u = account.user;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    setUser(u);
    setSession({ user: u });
  };

  const signOut = async () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setSession(null);
  };

  const updateUserProfile = (profileData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...profileData };
      setUser(updatedUser);
      setSession({ user: updatedUser });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
      // Update in accounts store too
      const accounts = getAccounts();
      if (accounts[updatedUser.email]) {
        accounts[updatedUser.email].user = updatedUser;
        localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
