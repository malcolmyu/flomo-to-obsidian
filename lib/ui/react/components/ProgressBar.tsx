import React, { useEffect, useState } from 'react';
import { subscribe } from '../../progressBus';

export function ProgressBar({ className }: { className?: string }) {
  const [percent, setPercent] = useState<number>(0);
  const [text, setText] = useState<string>('空闲');

  useEffect(() => {
    const unSub = subscribe((message, p) => {
      try {
        console.debug('[ProgressBar] receive:', { message, percent: p });
      } catch {
        // 忽略错误
      }
      if (typeof p === 'number') setPercent(Math.max(0, Math.min(100, p)));
      if (message) setText(message);
    });
    return () => unSub();
  }, []);

  const clz = `progress-block ${className ?? ''}`.trim();
  const showShimmer = percent < 99;
  return (
    <div className={clz}>
      <div className="progress-line-wrapper">
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${percent}%` }}>
            {showShimmer && <div className="progress-shimmer" />}
          </div>
        </div>
      </div>
      <div className="progress-text">{text}</div>
    </div>
  );
}
