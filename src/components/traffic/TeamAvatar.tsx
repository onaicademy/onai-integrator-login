/**
 * Premium Team Avatar Component
 * Gradients + Icons вместо emoji
 */

import { Crown, Zap, Rocket, Target, Building2, Users } from 'lucide-react';

interface TeamAvatarProps {
  teamName: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  className?: string;
}

// Премиальные градиенты для каждой команды
const TEAM_STYLES: Record<string, {
  gradient: string;
  icon: React.ReactNode;
  label: string;
  ring: string;
}> = {
  'Kenesary': {
    gradient: 'bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600',
    icon: <Crown className="w-full h-full" />,
    label: 'Kenesary',
    ring: 'ring-emerald-500/50'
  },
  'Arystan': {
    gradient: 'bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-600',
    icon: <Zap className="w-full h-full" />,
    label: 'Arystan',
    ring: 'ring-blue-500/50'
  },
  'Muha': {
    gradient: 'bg-gradient-to-br from-orange-400 via-red-500 to-pink-600',
    icon: <Rocket className="w-full h-full" />,
    label: 'Muha',
    ring: 'ring-orange-500/50'
  },
  'Traf4': {
    gradient: 'bg-gradient-to-br from-purple-400 via-violet-500 to-fuchsia-600',
    icon: <Target className="w-full h-full" />,
    label: 'Traf4',
    ring: 'ring-purple-500/50'
  },
  'default': {
    gradient: 'bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600',
    icon: <Building2 className="w-full h-full" />,
    label: 'Team',
    ring: 'ring-gray-500/50'
  }
};

const SIZE_CLASSES = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
  xl: 'w-12 h-12'
};

const ICON_SIZES = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
  xl: 'w-6 h-6'
};

export function TeamAvatar({ 
  teamName, 
  size = 'md', 
  showLabel = false,
  className = '' 
}: TeamAvatarProps) {
  const style = TEAM_STYLES[teamName] || TEAM_STYLES['default'];
  const sizeClass = SIZE_CLASSES[size];
  const iconSize = ICON_SIZES[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Avatar Circle with Gradient */}
      <div 
        className={`
          ${sizeClass} 
          ${style.gradient}
          rounded-full 
          flex items-center justify-center
          ring-2 ${style.ring}
          shadow-lg shadow-black/50
          relative
          overflow-hidden
          group
        `}
      >
        {/* Icon */}
        <div className={`${iconSize} text-white relative z-10`}>
          {style.icon}
        </div>
        
        {/* Glow effect on hover */}
        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/20 transition-all duration-300" />
      </div>

      {/* Label */}
      {showLabel && (
        <span className="text-sm font-medium text-gray-200">
          {style.label}
        </span>
      )}
    </div>
  );
}

/**
 * Team Badge - компактная версия для списков
 */
export function TeamBadge({ teamName }: { teamName: string }) {
  const style = TEAM_STYLES[teamName] || TEAM_STYLES['default'];
  
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/40 border border-gray-700/50">
      <div className={`w-4 h-4 ${style.gradient} rounded-full flex items-center justify-center`}>
        <div className="w-2.5 h-2.5 text-white">
          {style.icon}
        </div>
      </div>
      <span className="text-xs font-medium text-gray-300">{style.label}</span>
    </div>
  );
}

/**
 * Team Selector Option - для dropdown
 */
export function TeamOption({ teamName }: { teamName: string }) {
  const style = TEAM_STYLES[teamName] || TEAM_STYLES['default'];
  
  return (
    <div className="flex items-center gap-3">
      <div className={`w-6 h-6 ${style.gradient} rounded-full flex items-center justify-center ring-1 ${style.ring}`}>
        <div className="w-3.5 h-3.5 text-white">
          {style.icon}
        </div>
      </div>
      <span className="text-sm font-medium">{style.label}</span>
    </div>
  );
}
