import React from 'react';

interface OrganicShapeProps {
  type: 'blob' | 'star' | 'cloud' | 'heart' | 'spark';
  color: string;
  size?: number;
  className?: string;
}

export const OrganicShape: React.FC<OrganicShapeProps> = ({
  type,
  color,
  size = 100,
  className = '',
}) => {
  const shapes = {
    blob: (
      <svg viewBox="0 0 100 100" width={size} height={size} className={className}>
        <path
          d="M50,10 Q80,30 85,50 T50,90 Q20,70 15,50 T50,10"
          fill={color}
          opacity="0.9"
        />
      </svg>
    ),
    star: (
      <svg viewBox="0 0 100 100" width={size} height={size} className={className}>
        <path
          d="M50,5 L60,40 L95,40 L67,60 L77,95 L50,75 L23,95 L33,60 L5,40 L40,40 Z"
          fill={color}
          opacity="0.9"
        />
      </svg>
    ),
    cloud: (
      <svg viewBox="0 0 100 60" width={size} height={size * 0.6} className={className}>
        <path
          d="M25,35 Q25,25 35,25 Q40,15 50,15 Q60,15 65,25 Q75,25 75,35 Q75,45 65,45 L35,45 Q25,45 25,35"
          fill={color}
          opacity="0.9"
        />
      </svg>
    ),
    heart: (
      <svg viewBox="0 0 100 100" width={size} height={size} className={className}>
        <path
          d="M50,80 Q25,55 20,40 Q15,25 25,20 Q35,15 45,25 Q50,30 50,30 Q50,30 55,25 Q65,15 75,20 Q85,25 80,40 Q75,55 50,80"
          fill={color}
          opacity="0.9"
        />
      </svg>
    ),
    spark: (
      <svg viewBox="0 0 100 100" width={size} height={size} className={className}>
        <path
          d="M50,10 L55,40 L85,40 L60,55 L70,85 L50,65 L30,85 L40,55 L15,40 L45,40 Z"
          fill={color}
          opacity="0.9"
        />
      </svg>
    ),
  };

  return shapes[type];
};

// Decorative background shapes component
export const BackgroundShapes: React.FC = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Top left */}
      <div className="absolute -top-10 -left-10">
        <OrganicShape type="blob" color="#81C784" size={150} className="opacity-15" />
      </div>

      {/* Top right */}
      <div className="absolute top-20 -right-20">
        <OrganicShape type="cloud" color="#64B5F6" size={200} className="opacity-12" />
      </div>

      {/* Middle left */}
      <div className="absolute top-1/3 -left-16">
        <OrganicShape type="star" color="#FFF176" size={120} className="opacity-15" />
      </div>

      {/* Middle right */}
      <div className="absolute top-1/2 -right-12">
        <OrganicShape type="heart" color="#F06292" size={100} className="opacity-12" />
      </div>

      {/* Bottom left */}
      <div className="absolute bottom-20 -left-16">
        <OrganicShape type="spark" color="#FFB74D" size={130} className="opacity-15" />
      </div>

      {/* Bottom right */}
      <div className="absolute -bottom-10 -right-10">
        <OrganicShape type="blob" color="#BA68C8" size={180} className="opacity-12" />
      </div>
    </div>
  );
};
