"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authApi } from "./api/auth";
import { ApiUser, LoginPayload, RegisterPayload, UserRole } from "./api/types";
import { getStoredToken, clearStoredToken } from "./api/client";

export interface DemoAccount {
  email: string;
  name: string;
  role: UserRole;
  description: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: "toan.nguyen@lurnkode.edu",
    name: "Dr. Toan Nguyen",
    role: "Instructor",
    description: "Instructor for Data Structures & AI RAG",
  },
  {
    email: "nam.le@lurnkode.edu",
    name: "Prof. Nam Le",
    role: "Instructor",
    description: "Instructor for Modern Web Development",
  },
  {
    email: "khoa.tran@lurnkode.edu",
    name: "Dr. Khoa Tran",
    role: "Instructor",
    description: "Instructor for Advanced Database Systems",
  },
  {
    email: "learner@lurnkode.edu",
    name: "John Learner",
    role: "Learner",
    description: "Standard student account for learning and exercises",
  },
  {
    email: "admin@lurnkode.edu",
    name: "System Administrator",
    role: "Admin",
    description: "Full system administration and user management",
  },
];

export const DEFAULT_DEMO_PASSWORD = "Password123!@#";

interface AuthContextType {
  user: ApiUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<ApiUser>;
  register: (payload: RegisterPayload) => Promise<ApiUser>;
  logout: () => Promise<void>;
  loginWithDemoAccount: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize auth state from token & /api/v1/auth/me
  useEffect(() => {
    let mounted = true;
    const token = getStoredToken();

    if (!token) {
      return;
    }

    authApi
      .me()
      .then((res) => {
        if (mounted && res) {
          const apiUser: ApiUser = res.user || {
            id: res.userId,
            email: "user@lurnkode.edu",
            fullName: res.role === "Instructor" ? "Instructor" : "Learner",
            role: res.role as UserRole,
            status: "active",
          };
          setUser(apiUser);
        }
      })
      .catch(() => {
        if (mounted) {
          clearStoredToken();
          setUser(null);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (payload: LoginPayload): Promise<ApiUser> => {
    setIsLoading(true);
    try {
      const res = await authApi.login(payload);
      const apiUser: ApiUser = res.user || {
        id: res.userId,
        email: payload.email,
        fullName: res.role === "Instructor" ? "Instructor" : "Learner",
        role: res.role,
        status: "active",
      };
      setUser(apiUser);
      return apiUser;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (payload: RegisterPayload): Promise<ApiUser> => {
    setIsLoading(true);
    try {
      const res = await authApi.register(payload);
      const apiUser: ApiUser = res.user || {
        id: res.userId,
        email: payload.email,
        fullName: payload.fullName,
        role: res.role,
        status: "active",
      };
      setUser(apiUser);
      return apiUser;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
    } catch {
      clearStoredToken();
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  const loginWithDemoAccount = useCallback(
    async (email: string) => {
      await login({
        email,
        password: DEFAULT_DEMO_PASSWORD,
      });
    },
    [login]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        register,
        logout,
        loginWithDemoAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
