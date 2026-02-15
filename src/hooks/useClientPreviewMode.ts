import { useState, useCallback, createContext, useContext } from "react";

interface ClientPreviewContextType {
  isClientPreview: boolean;
  toggleClientPreview: () => void;
  exitClientPreview: () => void;
}

export const ClientPreviewContext = createContext<ClientPreviewContextType>({
  isClientPreview: false,
  toggleClientPreview: () => {},
  exitClientPreview: () => {},
});

export function useClientPreviewMode() {
  const [isClientPreview, setIsClientPreview] = useState(false);
  const toggleClientPreview = useCallback(() => setIsClientPreview(p => !p), []);
  const exitClientPreview = useCallback(() => setIsClientPreview(false), []);
  return { isClientPreview, toggleClientPreview, exitClientPreview };
}

export function useClientPreview() {
  return useContext(ClientPreviewContext);
}
