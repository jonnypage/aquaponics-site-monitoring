import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { cn } from '~/utils/cn';
import {
  isHexWireColor,
  isPresetWireColor,
  resolveWireColorCss,
  WIRE_COLOR_PRESET_ENTRIES,
  wireColorToPickerHex,
} from '~/utils/wire-color';

export interface WireColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function WireColorPicker({
  value,
  onChange,
  size = 'md',
  className,
}: WireColorPickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const customHex = isHexWireColor(value)
    ? value.trim().toLowerCase()
    : wireColorToPickerHex(value);
  const [draftHex, setDraftHex] = useState(customHex);

  function selectPreset(key: string) {
    onChange(key);
    setOpen(false);
  }

  function applyCustomHex(hex: string) {
    const normalized = hex.trim().toLowerCase();
    if (isHexWireColor(normalized)) {
      onChange(normalized);
      setDraftHex(normalized);
    }
  }

  function stopMenuEvent(e: React.SyntheticEvent) {
    e.stopPropagation();
  }

  return (
    <DropdownMenu
      modal={false}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setDraftHex(
            isHexWireColor(value)
              ? value.trim().toLowerCase()
              : wireColorToPickerHex(value),
          );
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          type='button'
          className={cn(
            'shrink-0 rounded-full border border-border ring-offset-background transition-shadow hover:ring-2 hover:ring-ring hover:ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            size === 'sm' ? 'h-4 w-4' : 'h-7 w-7',
            className,
          )}
          style={{ backgroundColor: resolveWireColorCss(value) }}
          aria-label={t('admin.sensors.wiringPickColor')}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align='start'
        className='w-56 p-3'
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <p className='mb-2 text-xs font-medium text-muted-foreground'>
          {t('admin.sensors.wiringWireColor')}
        </p>
        <div className='grid grid-cols-5 gap-2'>
          {WIRE_COLOR_PRESET_ENTRIES.map(({ key, hex }) => {
            const selected =
              isPresetWireColor(value) && value.trim().toLowerCase() === key;
            return (
              <button
                key={key}
                type='button'
                title={key}
                className={cn(
                  'h-7 w-7 rounded-full border border-border transition-shadow hover:ring-2 hover:ring-ring',
                  selected &&
                    'ring-2 ring-ring ring-offset-2 ring-offset-background',
                )}
                style={{ backgroundColor: hex }}
                onClick={() => selectPreset(key)}
              />
            );
          })}
        </div>
        <div
          className='mt-3 space-y-2 border-t pt-3'
          onPointerDown={stopMenuEvent}
        >
          <Label className='text-xs'>
            {t('admin.sensors.wiringColorCustom')}
          </Label>
          <div className='flex items-center gap-2'>
            <input
              type='color'
              className='h-9 w-9 shrink-0 cursor-pointer rounded border border-input bg-background p-0.5'
              value={wireColorToPickerHex(
                isHexWireColor(draftHex) ? draftHex : value,
              )}
              onPointerDown={stopMenuEvent}
              onKeyDown={stopMenuEvent}
              onChange={(e) => {
                const hex = e.target.value.toLowerCase();
                setDraftHex(hex);
                onChange(hex);
              }}
              aria-label={t('admin.sensors.wiringPickColor')}
            />
            <Input
              className='font-mono text-xs'
              value={draftHex}
              onPointerDown={stopMenuEvent}
              onKeyDown={(e) => {
                stopMenuEvent(e);
                if (e.key === 'Enter') {
                  e.preventDefault();
                  applyCustomHex(draftHex);
                  setOpen(false);
                }
              }}
              onChange={(e) => setDraftHex(e.target.value)}
              onBlur={() => applyCustomHex(draftHex)}
              placeholder='#000000'
            />
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
