import { Canvas, useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useRef } from 'react';
import * as THREE from 'three';
import type { BattleState } from '../types';

function HeroModel() {
  const ref = useRef<THREE.Group | null>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = Math.sin(clock.elapsedTime * 4) * 0.05;
  });
  return (
    <group ref={ref} position={[-1.7, 0.04, 0]} rotation={[0, 0.45, 0]}>
      <mesh position={[0, 0.68, 0]} castShadow>
        <capsuleGeometry args={[0.28, 0.62, 8, 18]} />
        <meshStandardMaterial color="#3d7eff" roughness={0.72} />
      </mesh>
      <mesh position={[0, 1.25, 0]} castShadow>
        <sphereGeometry args={[0.22, 18, 18]} />
        <meshStandardMaterial color="#f2c28f" roughness={0.8} />
      </mesh>
      <mesh position={[0.43, 0.72, -0.04]} rotation={[0.05, 0, -0.55]} castShadow>
        <boxGeometry args={[0.07, 0.94, 0.07]} />
        <meshStandardMaterial color="#e7d27c" metalness={0.2} roughness={0.3} />
      </mesh>
    </group>
  );
}

function EnemyModel({ boss, name }: { boss: boolean; name: string }) {
  const ref = useRef<THREE.Group | null>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = -0.45 + Math.sin(clock.elapsedTime * 2.2) * 0.08;
    ref.current.position.y = Math.sin(clock.elapsedTime * 3.2) * 0.035;
  });
  return (
    <group ref={ref} position={[1.75, 0.04, 0]} rotation={[0, -0.45, 0]} scale={boss ? 1.35 : 1}>
      <mesh position={[0, 0.7, 0]} castShadow>
        <dodecahedronGeometry args={[0.58, 1]} />
        <meshStandardMaterial color={boss ? '#d64b32' : '#58a65a'} roughness={0.72} metalness={0.08} />
      </mesh>
      <mesh position={[-0.2, 1.08, 0.42]} castShadow>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshStandardMaterial color="#f7e8a1" emissive="#f7e8a1" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0.2, 1.08, 0.42]} castShadow>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshStandardMaterial color="#f7e8a1" emissive="#f7e8a1" emissiveIntensity={0.5} />
      </mesh>
      <Text position={[0, 1.75, 0]} rotation={[-0.35, 0, 0]} fontSize={0.16} anchorX="center" outlineWidth={0.01} outlineColor="#1b0e09">
        {name}
      </Text>
    </group>
  );
}

export function BattleStage3D({ battle }: { battle: BattleState }) {
  return (
    <div className="battle-stage-3d">
      <Canvas shadows camera={{ position: [0, 2.6, 5.5], fov: 44 }} dpr={[1, 1.5]}>
        <color attach="background" args={['#151018']} />
        <ambientLight intensity={0.58} />
        <directionalLight position={[3, 6, 4]} intensity={1.2} castShadow />
        <fog attach="fog" args={['#151018', 5, 10]} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[3.2, 48]} />
          <meshStandardMaterial color="#4b3424" roughness={0.94} />
        </mesh>
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <ringGeometry args={[2.35, 2.55, 48]} />
          <meshStandardMaterial color="#b37a32" roughness={0.82} metalness={0.08} />
        </mesh>
        <HeroModel />
        <EnemyModel boss={battle.mode === 'boss'} name={battle.enemy.name} />
      </Canvas>
    </div>
  );
}
