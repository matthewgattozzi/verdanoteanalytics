import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.warn("404: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 font-heading text-[48px] text-forest">404</h1>
        <p className="mb-4 font-body text-[14px] text-slate">Oops! Page not found</p>
        <a href="/" className="font-body text-[13px] text-verdant font-medium hover:underline">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
