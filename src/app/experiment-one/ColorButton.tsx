import React, { useState } from 'react';
import Image from 'next/image';

export default function ColorButton({
  color,
  onClick,
  locked = true,
}: {
  color: string;
  onClick: (color: string) => void;
  locked?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={() => {
        if (locked) return;
        onClick(color);
      }}
      onMouseEnter={() => !locked && setHovered(true)}
      onMouseLeave={() => !locked && setHovered(false)}
      className={locked ? 'p-1 rounded' : 'p-1 rounded cursor-pointer'}
      style={{
        backgroundColor: color,
        boxShadow: !locked && hovered ? 'inset 0 0 0 2px #ffffff' : 'none',
        cursor: locked ? 'default' : undefined,
      }}
      aria-label={`Set color ${color}`}
    >
      <Image
        src="/lock.svg"
        alt="Locked"
        width={24}
        height={24}
        style={{ opacity: locked ? 1 : 0 }}
        priority
      />
    </button>
  );
}
