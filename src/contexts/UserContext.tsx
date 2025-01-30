import { createContext, useContext, useState, ReactNode } from "react";

interface UserData {
  color: string | null;
  sessionId: string | null;
}

interface UserContextType {
  userData: UserData;
  setUserData: (color: string, sessionId: string) => void;
  clearUserData: () => void;
}

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [userData, setUserData] = useState<UserData>(() => {
    const stored = localStorage.getItem("userData");
    return stored ? JSON.parse(stored) : { color: null, sessionId: null };
  });

  const setUserDataWithStorage = (color: string, sessionId: string) => {
    const newData = { color, sessionId };
    localStorage.setItem("userData", JSON.stringify(newData));
    setUserData(newData);
  };

  const clearUserData = () => {
    localStorage.removeItem("userData");
    setUserData({ color: null, sessionId: null });
  };

  return (
    <UserContext.Provider
      value={{
        userData,
        setUserData: setUserDataWithStorage,
        clearUserData,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
