'use client';

import type L from 'leaflet';
import { useMemo, useState } from 'react';
import { Marker } from 'react-leaflet';
import { bboxForRadius } from '@/lib/geo';
import { cn } from '@/lib/utils';
import { Alert } from './alert';
import { Button } from './button';
import {
  MapView,
  pinIcon,
  type LatLngBounds,
  type LatLngTuple,
} from './map-view.client';

export const PIN_PICKER_TEXT = {
  notFound: 'Arraste o pino até o local',
  // SPEC_DEVIATION: the spec doesn't word the hint, the confirmation or the labels.
  // Reason: the hint is the design's (07c); the rest is the simplest wording.
  hintTitle: 'O pino está na entrada da ONG?',
  hint: 'Se não estiver, arraste o pino até o lugar certo. É ali que os visitantes vão chegar.',
  confirm: 'Confirmar localização',
  confirmed: 'Localização confirmada.',
  map: 'Mapa com o pino da ONG',
  pin: 'Pino da ONG, arraste até o local',
  cluster: (count: number) => `${count} pinos`,
} as const;

/** Radius framed around the suggested point; dragging doesn't move the frame. */
const FRAME_KM = 0.3;

export interface PinPickerProps {
  tileUrl: string;
  attribution: string;
  /**
   * Geocoded address, or the city centre when it wasn't found (SIGN-19, SIGN-20).
   * Read once: give the picker a new `key` when the address changes (PROF-03).
   */
  position: LatLngTuple;
  /** Shows "Arraste o pino até o local" (SIGN-20). */
  notFound?: boolean;
  /** Confirmed position, or `null` once moving the pin undoes it (SIGN-21, SIGN-22, PROF-03). */
  onConfirmedChange: (position: LatLngTuple | null) => void;
  className?: string;
}

function frameAround([lat, lng]: LatLngTuple): LatLngBounds {
  const [minLng, minLat, maxLng, maxLat] = bboxForRadius(
    { lat, lng },
    FRAME_KM,
  );
  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}

export function PinPicker({
  tileUrl,
  attribution,
  position,
  notFound = false,
  onConfirmedChange,
  className,
}: PinPickerProps) {
  const [current, setCurrent] = useState(position);
  const [confirmed, setConfirmed] = useState(false);
  const icon = useMemo(() => pinIcon('selected', PIN_PICKER_TEXT.pin), []);
  const [bounds] = useState(() => frameAround(position));

  function unconfirm() {
    if (!confirmed) return;
    setConfirmed(false);
    onConfirmedChange(null);
  }

  function handleDragEnd(event: L.DragEndEvent) {
    const { lat, lng } = (event.target as L.Marker).getLatLng();
    setCurrent([lat, lng]);
    unconfirm();
  }

  function handleConfirm() {
    setConfirmed(true);
    onConfirmedChange(current);
  }

  return (
    <div
      data-slot="pin-picker"
      className={cn('flex flex-col gap-3', className)}
    >
      <div className="h-72 overflow-hidden rounded-card">
        <MapView
          tileUrl={tileUrl}
          attribution={attribution}
          bounds={bounds}
          label={PIN_PICKER_TEXT.map}
          clusterLabel={PIN_PICKER_TEXT.cluster}
        >
          <Marker
            position={current}
            icon={icon}
            draggable
            autoPan
            eventHandlers={{ dragend: handleDragEnd }}
          />
        </MapView>
      </div>
      {notFound ? (
        <Alert variant="error" title={PIN_PICKER_TEXT.notFound} />
      ) : (
        <Alert variant="info" title={PIN_PICKER_TEXT.hintTitle}>
          {PIN_PICKER_TEXT.hint}
        </Alert>
      )}
      <div role="status" className="text-sm font-semibold text-available-fg">
        {confirmed && PIN_PICKER_TEXT.confirmed}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="touch-target self-start"
        aria-pressed={confirmed}
        onClick={handleConfirm}
      >
        {PIN_PICKER_TEXT.confirm}
      </Button>
    </div>
  );
}
