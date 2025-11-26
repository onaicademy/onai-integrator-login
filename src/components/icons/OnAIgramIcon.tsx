import React from 'react';

interface OnAIgramIconProps {
  size?: number;
  className?: string;
  weight?: 'regular' | 'fill' | 'duotone';
}

/**
 * 🎨 Custom onAIgram Icon
 * AI Brain + Message Bubble fusion
 */
export const OnAIgramIcon: React.FC<OnAIgramIconProps> = ({ 
  size = 24, 
  className = "",
  weight = "regular" 
}) => {
  const isFilled = weight === "fill" || weight === "duotone";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Message Bubble Base */}
      <path
        d="M216 48H40C31.163 48 24 55.163 24 64v128c0 8.837 7.163 16 16 16h42.343l-10.343 21.657 53.657-21.657H216c8.837 0 16-7.163 16-16V64c0-8.837-7.163-16-16-16z"
        stroke="currentColor"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={isFilled ? "currentColor" : "none"}
        opacity={isFilled ? 0.2 : 1}
      />

      {/* AI Neural Network Lines (Brain Circuit) */}
      <g opacity={isFilled ? 0.8 : 1}>
        {/* Top neurons */}
        <circle cx="80" cy="100" r="6" fill="currentColor" />
        <circle cx="128" cy="100" r="6" fill="currentColor" />
        <circle cx="176" cy="100" r="6" fill="currentColor" />
        
        {/* Middle neurons */}
        <circle cx="100" cy="140" r="6" fill="currentColor" />
        <circle cx="156" cy="140" r="6" fill="currentColor" />
        
        {/* Bottom neuron */}
        <circle cx="128" cy="170" r="6" fill="currentColor" />

        {/* Neural connections */}
        <line x1="80" y1="100" x2="100" y2="140" stroke="currentColor" strokeWidth="2" opacity="0.5" />
        <line x1="128" y1="100" x2="100" y2="140" stroke="currentColor" strokeWidth="2" opacity="0.5" />
        <line x1="128" y1="100" x2="156" y2="140" stroke="currentColor" strokeWidth="2" opacity="0.5" />
        <line x1="176" y1="100" x2="156" y2="140" stroke="currentColor" strokeWidth="2" opacity="0.5" />
        <line x1="100" y1="140" x2="128" y2="170" stroke="currentColor" strokeWidth="2" opacity="0.5" />
        <line x1="156" y1="140" x2="128" y2="170" stroke="currentColor" strokeWidth="2" opacity="0.5" />
      </g>
    </svg>
  );
};

