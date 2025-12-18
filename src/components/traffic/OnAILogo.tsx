/**
 * OnAI Academy Logo SVG Component
 * Premium brand logo for Traffic Dashboard
 */

interface OnAILogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export function OnAILogo({ className = '', width = 120, height = 40 }: OnAILogoProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 200 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* "ON" Part */}
      <g>
        <circle cx="30" cy="30" r="22" stroke="#00FF88" strokeWidth="3" fill="none" />
        <circle cx="30" cy="30" r="12" fill="#00FF88" opacity="0.2" />
        <text 
          x="30" 
          y="38" 
          fontFamily="Arial, sans-serif" 
          fontSize="20" 
          fontWeight="bold" 
          fill="#00FF88" 
          textAnchor="middle"
        >
          ON
        </text>
      </g>
      
      {/* "AI" Part */}
      <g>
        <text 
          x="70" 
          y="40" 
          fontFamily="Arial, sans-serif" 
          fontSize="28" 
          fontWeight="bold" 
          fill="#FFFFFF"
        >
          AI
        </text>
        
        {/* AI indicator dots */}
        <circle cx="95" cy="15" r="2" fill="#00FF88" opacity="0.8" />
        <circle cx="102" cy="15" r="2" fill="#00FF88" opacity="0.6" />
        <circle cx="109" cy="15" r="2" fill="#00FF88" opacity="0.4" />
      </g>
      
      {/* "Academy" Part */}
      <g>
        <text 
          x="120" 
          y="30" 
          fontFamily="Arial, sans-serif" 
          fontSize="16" 
          fontWeight="500" 
          fill="#888888"
        >
          Academy
        </text>
        
        {/* Underline accent */}
        <line 
          x1="120" 
          y1="35" 
          x2="198" 
          y2="35" 
          stroke="#00FF88" 
          strokeWidth="1" 
          opacity="0.3"
        />
      </g>
      
      {/* Glow effect (optional) */}
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
}

export default OnAILogo;
