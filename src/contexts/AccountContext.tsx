import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useAccounts } from "@/hooks/useApi";

interface AccountContextType {
  selectedAccountId: string | null;
  setSelectedAccountId: (id: string | null) => void;
  accounts: any[];
  isLoading: boolean;
  selectedAccount: any | null;
}

const AccountContext = createContext<AccountContextType>({
  selectedAccountId: null,
  setSelectedAccountId: () => {},
  accounts: [],
  isLoading: false,
  selectedAccount: null,
});

export function AccountProvider({ children }: { children: ReactNode }) {
  const { data: accounts, isLoading } = useAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(() => {
    return localStorage.getItem("selectedAccountId");
  });

  // Auto-select first account if none selected
  useEffect(() => {
    if (!isLoading && accounts?.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, isLoading, selectedAccountId]);

  // Persist selection
  useEffect(() => {
    if (selectedAccountId) {
      localStorage.setItem("selectedAccountId", selectedAccountId);
    } else {
      localStorage.removeItem("selectedAccountId");
    }
  }, [selectedAccountId]);

  const selectedAccount = (accounts || []).find((a: any) => a.id === selectedAccountId) || null;

  return (
    <AccountContext.Provider value={{ selectedAccountId, setSelectedAccountId, accounts: accounts || [], isLoading, selectedAccount }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccountContext() {
  return useContext(AccountContext);
}
