import React from 'react';

// Fix: Corrected the component's props type from SVGProps to HTMLAttributes to match the root `div` element.
export const Logo: React.FC<React.HTMLAttributes<HTMLDivElement>> = (props) => (
  <div className="flex items-center justify-center" {...props}>
    <svg width="250" height="50" viewBox="0 0 250 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logo-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
      </defs>
      {/* Icon: Combination of book and brain */}
      <path d="M22 38.5C17.3056 38.5 13.5 34.6944 13.5 30C13.5 25.3056 17.3056 21.5 22 21.5C23.9782 21.5 25.7761 22.1887 27.2103 23.3373C27.9711 20.421 27.5684 17.3013 26.0968 14.7081C24.6251 12.115 22.2045 10.231 19.4005 9.44123C16.5965 8.65147 13.5973 9.04313 10.9669 10.5361C8.33642 12.0292 6.28479 14.512 5.25 17.5" stroke="url(#logo-gradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9.5 38.5L9.5 17.5C9.5 17.5 10.5 15.5 13.5 15.5" stroke="url(#logo-gradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M22 38.5C26.6944 38.5 30.5 34.6944 30.5 30C30.5 27.6105 29.5634 25.432 28.0622 23.8344" stroke="url(#logo-gradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 41L34 41" stroke="url(#logo-gradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Text: Idexintellect */}
      <text x="45" y="35" fontFamily="sans-serif" fontSize="30" fontWeight="bold" fill="url(#logo-gradient)">
        Idexintellect
      </text>
    </svg>
  </div>
);
