"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authApi } from "./api/auth";
import { ApiUser, LoginPayload, RegisterPayload } from "./api/types";
import { clearStoredToken, getStoredToken } from "./api/client";

interface AuthContextType {
  user: ApiUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<ApiUser>;
  register: (payload: RegisterPayload) => Promise<ApiUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const token = getStoredToken();

    if (!token) {
      setIsLoading(false);
      return () => {
        mounted = false;
      };
    }

    const restoreSession = async () => {
      try {
        const identity = await authApi.me();
        if (mounted) setUser(identity.user);
      } catch {
        try {
          await authApi.refresh();
          const identity = await authApi.me();
          if (mounted) setUser(identity.user);
        } catch {
          if (mounted) {
            clearStoredToken();
            setUser(null);
          }
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void restoreSession();

    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (payload: LoginPayload): Promise<ApiUser> => {
    setIsLoading(true);
    try {
      const res = await authApi.login(payload);
      if (!res.user) throw new Error("Login response did not include a user profile.");
      setUser(res.user);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (payload: RegisterPayload): Promise<ApiUser> => {
    setIsLoading(true);
    try {
      const res = await authApi.register(payload);
      if (!res.user) throw new Error("Registration response did not include a user profile.");
      setUser(res.user);
      return res.user;
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

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: Boolean(user), isLoading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
