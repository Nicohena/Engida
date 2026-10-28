import React from 'react';

interface AdminPageHeaderProps {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Shared page masthead for the admin console.
 *
 * The page title is the only display-type element; supporting copy and actions
 * stay in Manrope so operational screens remain easy to scan.
 */
export default function AdminPageHeader({
  title,
  description,
  actions,
  className = '',
}: AdminPageHeaderProps) {
  return (
    <header className={`admin-page-header ${className}`.trim()}>
      <div className="min-w-0">
        <h1 className="admin-page-title">{title}</h1>
        {description ? <p className="admin-page-description">{description}</p> : null}
      </div>
      {actions ? <div className="admin-page-actions">{actions}</div> : null}
    </header>
  );
}
