interface ComponentCardProps {
  title: string;
  children: React.ReactNode;
  className?: string; // Additional custom classes for styling
  desc?: string; // Description text
  onClick?: () => void;
  noHeader?: boolean;
  fillHeight?: boolean;
}

const ComponentCard: React.FC<ComponentCardProps> = ({
  title,
  children,
  className = "",
  desc = "",
  onClick,
  noHeader = false,
  fillHeight = false,
}) => {
  const outerClass = `rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] ${fillHeight ? "flex flex-col h-full" : ""} ${className}`;
  const bodyClass = `${fillHeight ? "flex-1 overflow-auto" : ""} p-4 sm:p-6 ${noHeader ? "" : "border-t border-gray-100 dark:border-gray-800"}`;

  return (
    <div
      className={outerClass}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {/* Card Header */}
      {!noHeader && (
        <div className="px-6 py-5" data-card-header>
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            {title}
          </h3>
          {desc && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {desc}
            </p>
          )}
        </div>
      )}

      {/* Card Body */}
      <div data-card-body className={bodyClass}>
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
};

export default ComponentCard;
