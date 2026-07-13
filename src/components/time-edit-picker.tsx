"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X, Check } from 'lucide-react';
import type { CardTheme } from '@/lib/types';

type TimeEditPickerProps = {
  currentTimeSeconds: number;
  onSave: (newTimeSeconds: number) => void;
  onCancel: () => void;
  theme: CardTheme;
  taskName: string;
};

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 5;
const CENTER_INDEX = Math.floor(VISIBLE_ITEMS / 2);

const REPEATS = 3; // We repeat the list 3 times for infinite scroll illusion

function ScrollColumn({
  values,
  selected,
  onSelect,
  label,
  themeColor,
}: {
  values: number[];
  selected: number;
  onSelect: (val: number) => void;
  label: string;
  themeColor: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isUserScrolling = useRef(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const hasInitialized = useRef(false);

  const totalItems = values.length;
  // Build the repeated array: [0..N-1, 0..N-1, 0..N-1]
  const repeatedValues = Array.from({ length: REPEATS }, () => values).flat();
  const middleSetStart = totalItems; // index where middle copy starts

  // On mount, instantly jump to the middle copy at the selected value
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = middleSetStart + values.indexOf(selected);
    el.scrollTop = idx * ITEM_HEIGHT;
    hasInitialized.current = true;
  }, []); // only on mount

  // When selected changes externally (not from scroll), smooth-scroll to it in the middle copy
  useEffect(() => {
    if (!hasInitialized.current) return;
    const el = scrollRef.current;
    if (!el || isUserScrolling.current) return;
    const idx = middleSetStart + values.indexOf(selected);
    el.scrollTo({ top: idx * ITEM_HEIGHT, behavior: 'smooth' });
  }, [selected]);

  const handleScroll = useCallback(() => {
    isUserScrolling.current = true;
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);

    scrollTimeout.current = setTimeout(() => {
      const el = scrollRef.current;
      if (!el) return;
      const scrollTop = el.scrollTop;
      const idx = Math.round(scrollTop / ITEM_HEIGHT);
      const clampedIdx = Math.max(0, Math.min(idx, repeatedValues.length - 1));
      const actualValue = repeatedValues[clampedIdx];

      // Snap to nearest item
      el.scrollTo({ top: clampedIdx * ITEM_HEIGHT, behavior: 'smooth' });
      onSelect(actualValue);

      // After snapping, silently jump to the equivalent position in the middle copy
      setTimeout(() => {
        const middleIdx = middleSetStart + values.indexOf(actualValue);
        if (Math.abs(clampedIdx - middleIdx) > 1) {
          el.scrollTop = middleIdx * ITEM_HEIGHT;
        }
        isUserScrolling.current = false;
      }, 300);
    }, 80);
  }, [values, onSelect, repeatedValues, middleSetStart]);

  const handleItemClick = (clickedIdx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    isUserScrolling.current = true;
    el.scrollTo({ top: clickedIdx * ITEM_HEIGHT, behavior: 'smooth' });
    onSelect(repeatedValues[clickedIdx]);
    setTimeout(() => {
      // Jump to middle copy equivalent
      const middleIdx = middleSetStart + values.indexOf(repeatedValues[clickedIdx]);
      if (Math.abs(clickedIdx - middleIdx) > 1) {
        el.scrollTop = middleIdx * ITEM_HEIGHT;
      }
      isUserScrolling.current = false;
    }, 400);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS, width: 80 }}>
        {/* Top fade gradient */}
        <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none"
          style={{ height: ITEM_HEIGHT * 2, background: 'linear-gradient(to bottom, var(--picker-bg) 0%, transparent 100%)' }}
        />
        {/* Bottom fade gradient */}
        <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none"
          style={{ height: ITEM_HEIGHT * 2, background: 'linear-gradient(to top, var(--picker-bg) 0%, transparent 100%)' }}
        />
        {/* Center highlight strip */}
        <div
          className={`absolute left-1 right-1 z-[5] rounded-xl border ${themeColor}`}
          style={{ top: ITEM_HEIGHT * CENTER_INDEX, height: ITEM_HEIGHT }}
        />

        {/* Scrollable list */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto scrollbar-hide relative z-[6]"
          style={{
            scrollSnapType: 'y mandatory',
            paddingTop: ITEM_HEIGHT * CENTER_INDEX,
            paddingBottom: ITEM_HEIGHT * CENTER_INDEX,
          }}
        >
          {repeatedValues.map((val, i) => (
            <div
              key={i}
              onClick={() => handleItemClick(i)}
              className={`flex items-center justify-center cursor-pointer select-none transition-all duration-200 ${
                val === selected
                  ? 'text-white font-bold text-2xl scale-110'
                  : 'text-slate-400 dark:text-slate-500 text-lg'
              }`}
              style={{
                height: ITEM_HEIGHT,
                scrollSnapAlign: 'start',
              }}
            >
              {val.toString().padStart(2, '0')}
            </div>
          ))}
        </div>
      </div>
      <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</span>
    </div>
  );
}

export function TimeEditPicker({ currentTimeSeconds, onSave, onCancel, theme, taskName }: TimeEditPickerProps) {
  const totalMinutes = Math.floor(currentTimeSeconds / 60);
  const [hours, setHours] = useState(Math.floor(totalMinutes / 60));
  const [minutes, setMinutes] = useState(totalMinutes % 60);

  const hourValues = Array.from({ length: 24 }, (_, i) => i);
  const minuteValues = Array.from({ length: 60 }, (_, i) => i);

  const handleSave = () => {
    const newTimeSeconds = (hours * 3600) + (minutes * 60);
    onSave(newTimeSeconds);
  };

  // Theme colors
  const themeConfig = {
    periwinkle: {
      stripClass: 'bg-violet-500/20 border-violet-500/40',
      btnClass: 'bg-violet-600 hover:bg-violet-700 text-white',
      accentText: 'text-violet-400',
      cancelBtnClass: 'hover:bg-purple-100 hover:text-purple-700 dark:hover:bg-purple-500/20 dark:hover:text-purple-400',
    },
    cyan: {
      stripClass: 'bg-cyan-500/20 border-cyan-500/40',
      btnClass: 'bg-cyan-600 hover:bg-cyan-700 text-white',
      accentText: 'text-cyan-400',
      cancelBtnClass: 'hover:bg-cyan-100 hover:text-cyan-700 dark:hover:bg-cyan-500/20 dark:hover:text-cyan-400',
    },
    emerald: {
      stripClass: 'bg-emerald-500/20 border-emerald-500/40',
      btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      accentText: 'text-emerald-400',
      cancelBtnClass: 'hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-500/20 dark:hover:text-emerald-400',
    },
  };

  const tc = themeConfig[theme] || themeConfig.periwinkle;

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      onClick={onCancel}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative z-10 flex flex-col items-center gap-6 p-6 rounded-3xl shadow-2xl border border-white/10 w-[300px] overflow-hidden"
        style={{
          background: 'var(--picker-bg)',
          ['--picker-bg' as string]: 'var(--picker-bg-resolved)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Custom CSS variable for the picker background */}
        <style>{`
          .time-edit-picker-modal {
            --picker-bg-resolved: rgba(255, 255, 255, 0.97);
          }
          .dark .time-edit-picker-modal {
            --picker-bg-resolved: rgba(15, 20, 40, 0.97);
          }
          .scrollbar-hide::-webkit-scrollbar { display: none; }
          .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>

        <div className="time-edit-picker-modal absolute inset-0 rounded-3xl" style={{ background: 'var(--picker-bg-resolved)' }} />

        {/* Content on top of bg */}
        <div className="relative z-10 flex flex-col items-center gap-6 w-full">
          {/* Title */}
          <div className="text-center">
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Edit Time</p>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[220px]">{taskName}</p>
          </div>

          {/* Scroll Columns */}
          <div className="flex items-center gap-4">
            <ScrollColumn
              values={hourValues}
              selected={hours}
              onSelect={setHours}
              label="Hours"
              themeColor={tc.stripClass}
            />
            {/* Colon separator */}
            <div className="flex flex-col items-center justify-center" style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }}>
              <span className={`text-3xl font-bold ${tc.accentText}`}>:</span>
            </div>
            <ScrollColumn
              values={minuteValues}
              selected={minutes}
              onSelect={setMinutes}
              label="Minutes"
              themeColor={tc.stripClass}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              className={`flex-1 h-11 rounded-xl border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 transition-colors ${tc.cancelBtnClass}`}
              onClick={onCancel}
            >
              <X className="w-4 h-4 mr-1.5" />
              Cancel
            </Button>
            <Button
              className={`flex-1 h-11 rounded-xl ${tc.btnClass}`}
              onClick={handleSave}
            >
              <Check className="w-4 h-4 mr-1.5" />
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
