import { createContext, useContext, useMemo, useState } from "react";

const SessionOverrideContext = createContext(null);

export function SessionOverrideProvider({ children }) {
  const [isOwnerOverride, setIsOwnerOverride] = useState(false);
  const value = useMemo(() => ({ isOwnerOverride, setIsOwnerOverride }), [isOwnerOverride]);

  return (
    <SessionOverrideContext.Provider value={value}>
      {children}
    </SessionOverrideContext.Provider>
  );
}

export function useSessionOverride() {
  const context = useContext(SessionOverrideContext);
  if (!context) throw new Error("useSessionOverride must be used within SessionOverrideProvider");
  return context;
}
