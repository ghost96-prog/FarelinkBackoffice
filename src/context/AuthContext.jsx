// context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Error checking auth state:", error);
    } finally {
      setIsLoading(false);
    }
  };
// Add this function inside AuthProvider, alongside login and logout
const register = async (sessionData) => {
  try {
    setIsLoading(true);
    
    if (sessionData.admin && sessionData.admin.email) {
      const newUser = {
        user_id: sessionData.admin.id,
        user_email: sessionData.admin.email,
        user_name: sessionData.admin.name,
        user_password: sessionData.admin.password,
        company_name: sessionData.company.name,
        token: sessionData.token,
      };

      setUser(newUser);
      localStorage.setItem("user", JSON.stringify(newUser));
      return { success: true, user: newUser };
    } else {
      return { success: false, error: "Invalid registration data" };
    }
  } catch (error) {
    return { success: false, error: error.message };
  } finally {
    setIsLoading(false);
  }
};
 // In AuthContext.js - update the login function
const login = async (sessionData) => {
  try {
    setIsLoading(true);

    // Use the actual API response data
    if (sessionData.admin && sessionData.admin.email) {
      const newUser = {
        user_id: sessionData.admin.id,
        user_email: sessionData.admin.email,
        user_name: sessionData.admin.name,
        user_password: sessionData.admin.password,
        company_name: sessionData.company.name,
        token: sessionData.token,
      };

      setUser(newUser);
      localStorage.setItem("user", JSON.stringify(newUser));
      return { success: true, user: newUser };
    } else {
      return { success: false, error: "Invalid Credentials" };
    }
  } catch (error) {
    return { success: false, error: error.message };
  } finally {
    setIsLoading(false);
  }
};
  const logout = async () => {
    try {
      setIsLoading(true);
      setUser(null);
      localStorage.removeItem("user");
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
              register, // Add this line

        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
export { AuthContext };

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};