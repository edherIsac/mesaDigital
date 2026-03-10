import type React from "react";
import { Link, useNavigate } from "react-router";

interface DropdownItemProps {
  tag?: "a" | "button";
  to?: string;
  onClick?: () => void;
  onItemClick?: () => void;
  baseClassName?: string;
  className?: string;
  children: React.ReactNode;
}

export const DropdownItem: React.FC<DropdownItemProps> = ({
  tag = "button",
  to,
  onClick,
  onItemClick,
  baseClassName = "block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900",
  className = "",
  children,
}) => {
  const combinedClasses = `${baseClassName} ${className}`.trim();
  const navigate = useNavigate();

  const callHandlers = () => {
    if (onClick) onClick();
    if (onItemClick) onItemClick();
  };

  if (tag === "a" && to) {
    return (
      <Link to={to} className={combinedClasses} onClick={callHandlers}>
        {children}
      </Link>
    );
  }

  if (tag === "button" && to) {
    const onBtnClick = (event: React.MouseEvent) => {
      event.preventDefault();
      callHandlers();
      navigate(to);
    };

    return (
      <button onClick={onBtnClick} className={combinedClasses}>
        {children}
      </button>
    );
  }

  const onBtnOnlyClick = (event: React.MouseEvent) => {
    event.preventDefault();
    callHandlers();
  };

  return (
    <button onClick={onBtnOnlyClick} className={combinedClasses}>
      {children}
    </button>
  );
};
