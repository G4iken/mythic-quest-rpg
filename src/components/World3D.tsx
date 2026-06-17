import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { memo, useEffect, useMemo, useRef, type MutableRefObject, type RefObject } from 'react';
import * as THREE from 'three';
import type { GameSave, Screen } from '../types';
import { AREAS } from '../data/areas';
import { ENEMIES } from '../data/enemies';
import type { StickVector } from './Joystick';

export type NearbyTarget =
  | { type: 'npc'; id: string; label: string; screen: Screen; distance: number; description?: string }
  | { type: 'area'; id: string; label: string; locked: boolean; reason: string; distance: number };

interface World3DProps {
  save: GameSave;
  stick: StickVector;
  onNearbyChange: (target: NearbyTarget | null) => void;
}

interface SceneProps extends World3DProps {
  keyboard: MutableRefObject<StickVector>;
}

const NPCS: Array<{ id: string; label: string; screen: Screen; position: [number, number, number]; role: string; description: string }> = [
  { id: 'elder', label: 'Village Elder', screen: 'quests', position: [-4.2, 0, 2.2], role: 'Main Quest', description: 'Review story quests, daily goals, and boss objectives.' },
  { id: 'blacksmith', label: 'Blacksmith', screen: 'equipment', position: [4.5, 0, 1.3], role: 'Gear', description: 'Equip weapons and armor before entering danger zones.' },
  { id: 'merchant', label: 'Merchant', screen: 'shop', position: [1.4, 0, 5.2], role: 'Shop', description: 'Buy potions, weapons, armor, heroes, and upgrade gear.' },
  { id: 'quest-board', label: 'Quest Board', screen: 'quests', position: [-1.5, 0, 5.7], role: 'Daily', description: 'Claim objectives for extra XP, coins, and loot.' },
  { id: 'training-master', label: 'Training Master', screen: 'skills', position: [-5.8, 0, -3.4], role: 'Skill Tree', description: 'Choose a skill path: Blade, Magic, or Guardian.' },
  { id: 'records-keeper', label: 'Records Keeper', screen: 'profile', position: [5.9, 0, -3.0], role: 'Records', description: 'View achievements, daily streaks, stars, grades, and leaderboard-style records.' }
];

const AREA_POSITIONS: Record<string, [number, number, number]> = {
  'green-village': [0, 0, -8.7],
  'forest-path': [-7.4, 0, -11.2],
  'crystal-cave': [7.6, 0, -11.1],
  'old-ruins': [-12.0, 0, -1.8],
  'lava-mountain': [12.0, 0, -1.8],
  'sky-temple': [8.6, 0, 9.7],
  'moon-graveyard': [-8.6, 0, 9.6],
  'abyssal-library': [-12.1, 0, 5.0],
  'dragon-citadel': [12.1, 0, 5.0],
  'ethereal-gate': [0, 0, 12.7],
  'frost-harbor': [-5.9, 0, 13.8],
  'sunken-forge': [5.9, 0, 13.8],
  'astral-throne': [0, 0, 15.0]
};

const AREA_MATERIALS: Record<string, string> = {
  'green-village': '#65b96a',
  'forest-path': '#2e7d38',
  'crystal-cave': '#55bfe6',
  'old-ruins': '#9d8c6d',
  'lava-mountain': '#e75d2c',
  'sky-temple': '#b8e3ff',
  'moon-graveyard': '#cfd2ff',
  'abyssal-library': '#7b4dff',
  'dragon-citadel': '#ff7a2d',
  'ethereal-gate': '#ffe3ff'
};

function getAreaPosition(areaId: string): [number, number, number] {
  const known = AREA_POSITIONS[areaId];
  if (known) return known;
  const index = Math.max(0, AREAS.findIndex(area => area.id === areaId));
  const angle = (index / Math.max(1, AREAS.length)) * Math.PI * 2 - Math.PI / 2;
  const radius = 12.5;
  return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius];
}

function distance2D(a: THREE.Vector3, b?: [number, number, number]) {
  if (!b) return Number.POSITIVE_INFINITY;
  return Math.hypot(a.x - b[0], a.z - b[2]);
}

function rng(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function useKeyboardVector() {
  const keyboard = useRef<StickVector>({ x: 0, y: 0 });
  const pressed = useRef(new Set<string>());

  useEffect(() => {
    function recalc() {
      const keys = pressed.current;
      const x = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
      const y = Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'));
      const length = Math.hypot(x, y) || 1;
      keyboard.current = { x: x / length, y: y / length };
    }
    function down(event: KeyboardEvent) {
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        pressed.current.add(event.code);
        recalc();
      }
    }
    function up(event: KeyboardEvent) {
      pressed.current.delete(event.code);
      recalc();
    }
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  return keyboard;
}

function Player({ playerRef }: { playerRef: RefObject<THREE.Group | null> }) {
  return (
    <group ref={playerRef} position={[0, 0.05, 1]}>
      <mesh position={[0, 0.75, 0]} castShadow>
        <capsuleGeometry args={[0.32, 0.75, 8, 16]} />
        <meshStandardMaterial color="#3d7eff" roughness={0.72} metalness={0.08} />
      </mesh>
      <mesh position={[0, 1.42, 0]} castShadow>
        <sphereGeometry args={[0.28, 20, 20]} />
        <meshStandardMaterial color="#f1c28d" roughness={0.8} />
      </mesh>
      <mesh position={[0.38, 0.86, -0.07]} rotation={[0.1, 0, -0.42]} castShadow>
        <boxGeometry args={[0.08, 0.92, 0.08]} />
        <meshStandardMaterial color="#d8c37f" roughness={0.35} metalness={0.25} />
      </mesh>
      <mesh position={[0, 1.01, 0.34]} castShadow>
        <boxGeometry args={[0.7, 0.78, 0.08]} />
        <meshStandardMaterial color="#c63f3f" roughness={0.85} />
      </mesh>
    </group>
  );
}

function NPC({ label, role, position }: { label: string; role: string; position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group | null>(null);
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime * 0.9 + phase;
    groupRef.current.position.x = position[0] + Math.sin(t) * 0.4;
    groupRef.current.position.z = position[2] + Math.cos(t * 1.2) * 0.28;
    groupRef.current.position.y = position[1] + Math.sin(t * 2.2) * 0.03;
    groupRef.current.rotation.y = Math.sin(t * .5) * 0.14;
  });
  return (
    <group ref={groupRef} position={position}>
      <mesh position={[0, 0.46, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.36, 0.9, 14]} />
        <meshStandardMaterial color="#8b5d33" roughness={0.82} />
      </mesh>
      <mesh position={[0, 1.06, 0]} castShadow>
        <sphereGeometry args={[0.24, 18, 18]} />
        <meshStandardMaterial color="#f3c894" roughness={0.8} />
      </mesh>
      <Text position={[0, 1.62, 0]} rotation={[-0.45, 0, 0]} fontSize={0.22} anchorX="center" anchorY="middle" outlineWidth={0.015} outlineColor="#2a180a">
        {label}
      </Text>
      <Text position={[0, 1.34, 0]} rotation={[-0.45, 0, 0]} fontSize={0.14} anchorX="center" anchorY="middle" color="#ffd36b">
        {role}
      </Text>
    </group>
  );
}

function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.16, 1.1, 10]} />
        <meshStandardMaterial color="#6e3f1e" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.25, 0]} castShadow>
        <coneGeometry args={[0.68, 1.35, 12]} />
        <meshStandardMaterial color="#1e6d37" roughness={0.88} />
      </mesh>
    </group>
  );
}

function House({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 1.1, 1.5]} />
        <meshStandardMaterial color="#8c6846" roughness={0.86} />
      </mesh>
      <mesh position={[0, 1.25, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1.45, 0.85, 4]} />
        <meshStandardMaterial color="#57301d" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.28, 0.78]}>
        <boxGeometry args={[0.42, 0.56, 0.05]} />
        <meshStandardMaterial color="#2c180d" roughness={0.7} />
      </mesh>
    </group>
  );
}

function AreaGate({ area, save }: { area: (typeof AREAS)[number]; save: GameSave }) {
  const position = getAreaPosition(area.id);
  const unlockedAreas = save.player.unlockedAreaIds ?? ['green-village'];
  const unlocked = unlockedAreas.includes(area.id) && save.player.level >= area.requiredLevel;
  const boss = ENEMIES[area.bossId];
  const color = AREA_MATERIALS[area.id] ?? '#ffffff';

  return (
    <group position={position}>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.45, 28]} />
        <meshStandardMaterial color={color} roughness={0.9} transparent opacity={unlocked ? 0.62 : 0.32} />
      </mesh>
      <mesh position={[0, 1.05, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.78, 0.08, 12, 32]} />
        <meshStandardMaterial color={unlocked ? color : '#6c6c6c'} emissive={unlocked ? color : '#111111'} emissiveIntensity={unlocked ? 0.35 : 0.05} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.68, 0]} castShadow>
        <boxGeometry args={[1.6, 0.18, 0.18]} />
        <meshStandardMaterial color="#4b3524" roughness={0.8} />
      </mesh>
      <Text position={[0, 2.06, 0]} rotation={[-0.45, 0, 0]} fontSize={0.22} anchorX="center" anchorY="middle" outlineWidth={0.015} outlineColor="#140d08">
        {area.name}
      </Text>
      <Text position={[0, 1.75, 0]} rotation={[-0.45, 0, 0]} fontSize={0.14} anchorX="center" anchorY="middle" color={unlocked ? '#ffd36b' : '#b5b5b5'}>
        {unlocked ? `Boss: ${boss?.name ?? 'Unknown Boss'}` : `Locked Lv ${area.requiredLevel}+`}
      </Text>
    </group>
  );
}

function GroundDetails() {
  const trees = useMemo(() => [
    [-12, 0, -12], [-10, 0, -7], [-13, 0, 0], [-8, 0, 12], [-4, 0, -13],
    [11, 0, -12], [13, 0, -5], [12, 0, 0], [8, 0, 12], [3, 0, 13]
  ] as Array<[number, number, number]>, []);
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[34, 34, 12, 12]} />
        <meshStandardMaterial color="#2f5e36" roughness={0.96} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} receiveShadow>
        <ringGeometry args={[2.8, 3.05, 52]} />
        <meshStandardMaterial color="#a98357" roughness={0.96} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]} receiveShadow>
        <circleGeometry args={[2.2, 48]} />
        <meshStandardMaterial color="#8fbf69" roughness={0.96} />
      </mesh>
      <House position={[-3.5, 0, -1.5]} rotation={0.35} />
      <House position={[3.5, 0, -1.8]} rotation={-0.35} />
      <House position={[0.8, 0, 3.0]} rotation={Math.PI} />
      {trees.map((position, index) => <Tree key={`${position.join('-')}`} position={position} scale={index % 3 === 0 ? 1.25 : 1} />)}
      <mesh position={[10.4, 0.05, 8.9]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[2.6, 28]} />
        <meshStandardMaterial color="#44221c" emissive="#401207" emissiveIntensity={0.18} roughness={0.88} />
      </mesh>
      <mesh position={[8.8, 0.05, -9.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[2.2, 28]} />
        <meshStandardMaterial color="#29506a" emissive="#1d7ca5" emissiveIntensity={0.16} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.04, 14]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[2.6, 32]} />
        <meshStandardMaterial color="#6b87a8" emissive="#99cfff" emissiveIntensity={0.12} roughness={0.8} />
      </mesh>
    </>
  );
}

function Scene({ save, stick, keyboard, onNearbyChange }: SceneProps) {
  const playerRef = useRef<THREE.Group | null>(null);
  const lastTargetId = useRef<string>('none');
  const ambientLightRef = useRef<THREE.DirectionalLight | null>(null);
  const weatherGroupRef = useRef<THREE.Group | null>(null);
  const backgroundColor = useMemo(() => new THREE.Color('#101929'), []);
  const weatherDrops = useMemo(() => Array.from({ length: 16 }, () => ({ x: rng(-14, 14), z: rng(-14, 14), y: rng(1.2, 9.8), length: rng(0.14, 0.28) })), []);
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 8, 9);
    camera.lookAt(0, 0.8, 0);
  }, [camera]);

  useFrame((state, delta) => {
    const cycle = (state.clock.elapsedTime / 18) % 1;
    const dayValue = Math.sin(cycle * Math.PI * 2) * 0.45 + 0.55;
    const skyColor = new THREE.Color().setHSL(0.63, 0.22, Math.max(0.05, dayValue * 0.14));
    backgroundColor.lerp(skyColor, 0.08);
    if (state.scene.fog) state.scene.fog.color.lerp(skyColor, 0.1);
    if (ambientLightRef.current) {
      ambientLightRef.current.color.setHSL(0.12, 0.7, 0.35 + dayValue * 0.22);
      ambientLightRef.current.intensity = 0.9 + dayValue * 0.38;
    }
    const rain = cycle > 0.1 && cycle < 0.55;
    const mist = cycle >= 0.55 && cycle < 0.8;
    if (weatherGroupRef.current) {
      weatherGroupRef.current.children.forEach(child => {
        if (!(child instanceof THREE.Mesh)) return;
        child.position.y -= delta * (rain ? 14 : mist ? 2 : 0);
        if (child.position.y < 0) child.position.y = 10;
        (child.material as THREE.Material & { opacity: number }).opacity = rain ? 0.18 : mist ? 0.08 : 0;
      });
    }

    const player = playerRef.current;
    if (!player) return;
    const vector = Math.hypot(stick.x, stick.y) > 0.05 ? stick : keyboard.current;
    const length = Math.min(1, Math.hypot(vector.x, vector.y));
    if (length > 0.04) {
      const speed = 4.6;
      const moveX = vector.x * speed * delta;
      const moveZ = -vector.y * speed * delta;
      player.position.x = THREE.MathUtils.clamp(player.position.x + moveX, -14.2, 14.2);
      player.position.z = THREE.MathUtils.clamp(player.position.z + moveZ, -14.2, 15.2);
      player.rotation.y = Math.atan2(moveX, moveZ);
      player.position.y = 0.05 + Math.sin(state.clock.elapsedTime * 12) * 0.035;
    } else {
      player.position.y = THREE.MathUtils.lerp(player.position.y, 0.05, 0.18);
    }

    const followTarget = new THREE.Vector3(player.position.x, 7.5, player.position.z + 8.4);
    camera.position.lerp(followTarget, 0.08);
    camera.lookAt(player.position.x, 0.9, player.position.z);

    const candidates: NearbyTarget[] = [];
    for (const npc of NPCS) {
      const distance = distance2D(player.position, npc.position);
      if (distance < 2.15) candidates.push({ type: 'npc', id: npc.id, label: npc.label, screen: npc.screen, distance, description: npc.description });
    }
    for (const area of AREAS) {
      const position = getAreaPosition(area.id);
      const distance = distance2D(player.position, position);
      if (distance < 2.5) {
        const unlockedAreas = save.player.unlockedAreaIds ?? ['green-village'];
        const unlocked = unlockedAreas.includes(area.id) && save.player.level >= area.requiredLevel;
        candidates.push({ type: 'area', id: area.id, label: area.name, locked: !unlocked, reason: area.unlockCondition, distance });
      }
    }
    candidates.sort((a, b) => a.distance - b.distance);
    const next = candidates[0] ?? null;
    const id = next ? `${next.type}:${next.id}:${'locked' in next ? next.locked : false}` : 'none';
    if (lastTargetId.current !== id) {
      lastTargetId.current = id;
      onNearbyChange(next);
    }
  });

  return (
    <>
      <color attach="background" args={[backgroundColor]} />
      <ambientLight intensity={0.72} />
      <directionalLight ref={ambientLightRef} position={[6, 9, 5]} intensity={1.35} castShadow shadow-mapSize={[1024, 1024]} />
      <fog attach="fog" args={[backgroundColor, 13, 34]} />
      <GroundDetails />
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[6.2, 6.45, 72]} />
        <meshStandardMaterial color="#e4b965" roughness={0.78} metalness={0.1} />
      </mesh>
      {NPCS.map(npc => <NPC key={npc.id} label={npc.label} role={npc.role} position={npc.position} />)}
      {AREAS.map(area => <AreaGate key={area.id} area={area} save={save} />)}
      <group ref={weatherGroupRef}>
        {weatherDrops.map((drop, index) => (
          <mesh key={index} position={[drop.x, drop.y, drop.z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.02, drop.length]} />
            <meshBasicMaterial color="#a4d3ff" transparent opacity={0} depthWrite={false} />
          </mesh>
        ))}
      </group>
      <Player playerRef={playerRef} />
    </>
  );
}

export const World3D = memo(function World3D({ save, stick, onNearbyChange }: World3DProps) {
  const keyboard = useKeyboardVector();
  return (
    <Canvas shadows camera={{ fov: 48, near: 0.1, far: 80 }} dpr={[1, 1.6]}>
      <color attach="background" args={['#101929']} />
      <Scene save={save} stick={stick} keyboard={keyboard} onNearbyChange={onNearbyChange} />
    </Canvas>
  );
});
