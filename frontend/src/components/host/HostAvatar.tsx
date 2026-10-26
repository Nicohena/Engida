'use client';

import React from 'react';

interface HostAvatarProps {
  /** Profile picture URL, e.g. the Google account photo. */
  src?: string | null;
  /** Used for the initials fallback. */
  name: string;
  size?: number;
  className?: string;
}

/**
 * Host profile picture with a graceful fallback to the user's initials when
 * no photo is set (or the remote image cannot be loaded).
 */
export default function HostAvatar({
  src,
  name,
  size = 36,
  className = '',
}: HostAvatarProps) {
  const [imageFailed, setImageFailed] = React.useState(false);
  const showImage = Boolean(src) && !imageFailed;

  return (
    <div
      className={`rounded-full bg-[#33599E] flex items-center justify-center text-white font-black overflow-hidden flex-shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src as string}
          alt=""
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        (name || '?').charAt(0).toUpperCase()
      )}
    </div>
  );
}
