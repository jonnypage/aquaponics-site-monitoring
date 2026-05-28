import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  DEFAULT_SENSOR_WIRING_TEMPLATE,
  isValidWireId,
  slugWireIdFromLabel,
  type SensorWireDef,
  type SensorWiringTemplate,
} from '~/utils/sensor-wiring';
import { WireColorPicker } from '~/components/admin/wire-color-picker';

export interface SensorWiringEditorProps {
  value: SensorWiringTemplate;
  onChange: (next: SensorWiringTemplate) => void;
}

function nextWireId(wires: SensorWireDef[], label: string): string {
  let id = slugWireIdFromLabel(label);
  let n = 0;
  while (wires.some((w) => w.id === id)) {
    n += 1;
    id = `${slugWireIdFromLabel(label)}_${n}`;
  }
  return id;
}

export function SensorWiringEditor({
  value,
  onChange,
}: SensorWiringEditorProps) {
  const { t } = useTranslation();
  const wires = value.wires.length
    ? value.wires
    : DEFAULT_SENSOR_WIRING_TEMPLATE.wires;

  function patch(partial: Partial<SensorWiringTemplate>) {
    onChange({ ...value, wires, ...partial });
  }

  function updateWire(index: number, partial: Partial<SensorWireDef>) {
    const next = wires.map((w, i) => (i === index ? { ...w, ...partial } : w));
    onChange({ ...value, wires: next });
  }

  function removeWire(index: number) {
    if (wires.length <= 1) {
      return;
    }
    onChange({ ...value, wires: wires.filter((_, i) => i !== index) });
  }

  function addWire() {
    const label = t('admin.sensors.wiringNewWireLabel');
    onChange({
      ...value,
      wires: [
        ...wires,
        {
          id: nextWireId(wires, label),
          label,
          color: '#3b82f6',
          required: true,
        },
      ],
    });
  }

  return (
    <fieldset className='space-y-3 rounded-md border p-3'>
      <legend className='px-1 text-sm font-medium'>
        {t('admin.sensors.wiringTitle')}
      </legend>
      <p className='text-xs text-muted-foreground'>
        {t('admin.sensors.wiringHelp')}
      </p>
      <ul className='space-y-3'>
        {wires.map((wire, index) => (
          <li
            key={`${wire.id}-${index}`}
            className='flex flex-wrap items-end gap-2 rounded-md border p-2'
          >
            <div className='flex flex-col gap-1'>
              <Label className='text-xs leading-none'>
                {t('admin.sensors.wiringWireId')}
              </Label>
              <Input
                className='w-28 font-mono text-xs'
                value={wire.id}
                onChange={(e) => updateWire(index, { id: e.target.value })}
              />
            </div>
            <div className='flex min-w-[8rem] flex-1 flex-col gap-1'>
              <Label className='text-xs leading-none'>
                {t('admin.sensors.wiringWireLabel')}
              </Label>
              <Input
                value={wire.label}
                onChange={(e) => updateWire(index, { label: e.target.value })}
              />
            </div>
            <div className='flex flex-col gap-1'>
              <Label className='text-xs leading-none'>
                {t('admin.sensors.wiringWireColor')}
              </Label>
              <div className='flex h-10 items-center'>
                <WireColorPicker
                  value={wire.color}
                  onChange={(color) => updateWire(index, { color })}
                />
              </div>
            </div>
            <div className='flex flex-col gap-1'>
              <Label
                className='pointer-events-none text-xs leading-none opacity-0'
                aria-hidden
              >
                —
              </Label>
              <label className='flex h-10 items-center gap-1.5 text-xs'>
                <input
                  type='checkbox'
                  className='rounded border-input'
                  checked={wire.required !== false}
                  onChange={(e) =>
                    updateWire(index, { required: e.target.checked })
                  }
                />
                {t('admin.sensors.wiringRequired')}
              </label>
            </div>
            <div className='flex flex-col gap-1'>
              <Label
                className='pointer-events-none text-xs leading-none opacity-0'
                aria-hidden
              >
                —
              </Label>
              <div className='flex h-10 items-center'>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='shrink-0'
                  disabled={wires.length <= 1}
                  onClick={() => removeWire(index)}
                  aria-label={t('admin.sensors.wiringRemoveWire')}
                >
                  <Trash2 className='h-4 w-4' />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={addWire}
        disabled={wires.length >= 8}
      >
        <Plus className='mr-1 h-4 w-4' />
        {t('admin.sensors.wiringAddWire')}
      </Button>
      <label className='flex items-center gap-2 text-sm'>
        <input
          type='checkbox'
          checked={value.allowExtraWires ?? false}
          onChange={(e) => patch({ allowExtraWires: e.target.checked })}
        />
        {t('admin.sensors.wiringAllowExtra')}
      </label>
      {value.allowExtraWires ? (
        <div className='flex items-center gap-2'>
          <Label htmlFor='maxExtra' className='text-sm'>
            {t('admin.sensors.wiringMaxExtra')}
          </Label>
          <Input
            id='maxExtra'
            className='w-16'
            inputMode='numeric'
            value={String(value.maxExtraWires ?? 2)}
            onChange={(e) => {
              const n = Number.parseInt(e.target.value, 10);
              patch({
                maxExtraWires: Number.isFinite(n)
                  ? Math.min(4, Math.max(0, n))
                  : 2,
              });
            }}
          />
        </div>
      ) : null}
      {wires.some((w) => !isValidWireId(w.id)) ? (
        <p className='text-xs text-destructive'>
          {t('admin.sensors.wiringIdInvalid')}
        </p>
      ) : null}
    </fieldset>
  );
}
