import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <h3 className="text-[12px] font-bold uppercase tracking-wider px-1" style={{ color: 'var(--text-muted)' }}>{title}</h3>
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card-bg)', boxShadow: '0px 1px 4px rgba(0,0,0,0.06)' }}>
      {children}
    </div>
  </div>
);

export const Chevron = () => <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} className="flex-shrink-0" />;

export const Row = ({
  icon: Icon, iconColor, label, subtitle, right, onClick, noBorder,
}: {
  icon: any; iconColor?: string; label: string; subtitle?: string;
  right?: React.ReactNode; onClick?: () => void; noBorder?: boolean;
}) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 text-left transition-colors hover:bg-muted/40"
    style={{ minHeight: 56, padding: '12px 16px', borderBottom: noBorder ? 'none' : '1px solid var(--border-c)' }}
  >
    <Icon size={20} style={{ color: iconColor || 'hsl(213,78%,48%)' }} className="flex-shrink-0 mt-0.5" />
    <div className="flex-1 min-w-0">
      <div className="text-[15px] font-medium truncate" style={{ color: 'var(--text-dark)' }}>{label}</div>
      {subtitle && <div className="text-[12px] truncate" style={{ color: 'var(--text-muted)' }}>{subtitle}</div>}
    </div>
    {right}
  </button>
);

export const sw = (val: boolean, set: (v: boolean) => void) => (
  <Switch checked={val} onCheckedChange={set} onClick={e => e.stopPropagation()} />
);
