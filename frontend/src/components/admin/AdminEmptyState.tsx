import React from 'react';

interface AdminEmptyStateProps {
  title: string;
  copy: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export default function AdminEmptyState({
  title,
  copy,
  action,
  icon,
}: AdminEmptyStateProps) {
  return (
    <div className="admin-empty">
      {icon ? (
        <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full border border-[#d8d0c8] bg-[#f6f0e8] text-[#78706a]">
          {icon}
        </div>
      ) : null}
      <p className="admin-empty-title">{title}</p>
      <p className="admin-empty-copy">{copy}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
