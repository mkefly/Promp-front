import React, { useEffect } from 'react';

export function Modal({ open, onClose, children, title }:{
  open: boolean; onClose: ()=>void; children: React.ReactNode; title?: string;
}){
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" onClick={onClose}/>
      <div className="relative w-[min(900px,92vw)] max-h-[80vh] overflow-hidden rounded-lg border
                      border-[color-mix(in_oklab,var(--accent)_45%,black)]
                      bg-[rgba(0,20,0,.92)] shadow-2xl p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="glow">{title || 'Composer'}</div>
          <button className="btn" onClick={onClose}>close</button>
        </div>
        <div className="overflow-auto max-h-[70vh]">{children}</div>
      </div>
    </div>
  );
}
