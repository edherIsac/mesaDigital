import { createContext, useContext, useState, useEffect, useRef } from "react";
import { useLocation } from "react-router";

type SidebarContextType = {
  isExpanded: boolean;
  isMobileOpen: boolean;
  isHovered: boolean;
  activeItem: string | null;
  openSubmenu: string | null;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  setIsHovered: (isHovered: boolean) => void;
  setActiveItem: (item: string | null) => void;
  toggleSubmenu: (item: string) => void;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const location = useLocation();
  const prevExpandedRef = useRef<boolean | null>(null);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsMobileOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const toggleSidebar = () => {
    setIsExpanded((prev) => !prev);
  };

  const toggleMobileSidebar = () => {
    setIsMobileOpen((prev) => !prev);
  };

  const toggleSubmenu = (item: string) => {
    setOpenSubmenu((prev) => (prev === item ? null : item));
  };

  useEffect(() => {
    const path = location.pathname || "";
    console.debug("[SidebarContext] pathname:", path, "isMobile:", isMobile, "isExpanded:", isExpanded, "prevSaved:", prevExpandedRef.current);
    if (path.startsWith("/orders/start") || path.startsWith("/kds") || path.startsWith("/mapa-mesas")) {
      if (prevExpandedRef.current === null) prevExpandedRef.current = isExpanded;
      if (isExpanded) {
        console.debug("[SidebarContext] collapsing sidebar for orders.start; saved:", prevExpandedRef.current);
        setIsExpanded(false);
      } else {
        console.debug("[SidebarContext] sidebar already collapsed");
      }
    } else {
      if (prevExpandedRef.current !== null) {
        console.debug("[SidebarContext] restoring sidebar to:", prevExpandedRef.current);
        setIsExpanded(prevExpandedRef.current);
        prevExpandedRef.current = null;
      }
    }
  }, [location.pathname, isExpanded, isMobile]);

  return (
    <SidebarContext.Provider
      value={{
        isExpanded: isMobile ? false : isExpanded,
        isMobileOpen,
        isHovered,
        activeItem,
        openSubmenu,
        toggleSidebar,
        toggleMobileSidebar,
        setIsHovered,
        setActiveItem,
        toggleSubmenu,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};
