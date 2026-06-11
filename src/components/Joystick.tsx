import { useEffect, useRef, useState } from 'react';

export interface StickVector {
  x: number;
  y: number;
}

interface Props {
  onMove: (vector: StickVector) => void;
  disabled?: boolean;
}

const MAX_DISTANCE = 44;

function clampVector(dx: number, dy: number) {
  const distance = Math.hypot(dx, dy);
  if (distance <= MAX_DISTANCE) return { dx, dy, distance };
  const scale = MAX_DISTANCE / distance;
  return { dx: dx * scale, dy: dy * scale, distance: MAX_DISTANCE };
}

export function Joystick({ onMove, disabled }: Props) {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const pointerId = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  function stop() {
    pointerId.current = null;
    setKnob({ x: 0, y: 0 });
    onMove({ x: 0, y: 0 });
  }

  function move(clientX: number, clientY: number) {
    const base = baseRef.current;
    if (!base || disabled) return;
    const rect = base.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const { dx, dy } = clampVector(clientX - centerX, clientY - centerY);
    setKnob({ x: dx, y: dy });
    onMove({ x: dx / MAX_DISTANCE, y: -dy / MAX_DISTANCE });
  }

  useEffect(() => {
    function onPointerMove(event: PointerEvent) {
      if (pointerId.current !== event.pointerId) return;
      event.preventDefault();
      move(event.clientX, event.clientY);
    }
    function onPointerUp(event: PointerEvent) {
      if (pointerId.current !== event.pointerId) return;
      stop();
    }
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [disabled]);

  return (
    <div
      ref={baseRef}
      className={`joystick ${disabled ? 'disabled' : ''}`}
      onPointerDown={event => {
        if (disabled) return;
        pointerId.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        move(event.clientX, event.clientY);
      }}
      aria-label="Movement joystick"
    >
      <div className="joystick-ring" />
      <div className="joystick-knob" style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }} />
    </div>
  );
}
