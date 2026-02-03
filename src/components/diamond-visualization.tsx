"use client";

import { useRef, useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Text } from "@react-three/drei";
import * as THREE from "three";

// Types
interface DiamondState {
  dimensions: [number, number, number, number, number, number, number, number];
  depth: number;
  time: number;
  coherence: number;
  alchemicalStage?: string;
}

interface DiamondVisualizationProps {
  state: DiamondState;
  animate?: boolean;
  interactive?: boolean;
  showLabels?: boolean;
  colorScheme?: "default" | "coherence" | "operator" | "stage";
}

// Octahedron vertices
const VERTICES = [
  { position: [0, 1.5, 0] as [number, number, number], label: "Witness", symbol: "W" },
  { position: [1, 0, 0] as [number, number, number], label: "Form", symbol: "F" },
  { position: [0, 0, 1] as [number, number, number], label: "Awareness", symbol: "A" },
  { position: [-1, 0, 0] as [number, number, number], label: "Meaning", symbol: "M" },
  { position: [0, 0, -1] as [number, number, number], label: "Telos", symbol: "T" },
  { position: [0, -1.5, 0] as [number, number, number], label: "Potential", symbol: "P" },
  { position: [0.7, 0.7, 0.7] as [number, number, number], label: "Response", symbol: "R" },
  { position: [-0.7, -0.7, -0.7] as [number, number, number], label: "Connection", symbol: "C" },
];

const EDGES = [
  [0, 1], [0, 2], [0, 3], [0, 4],
  [5, 1], [5, 2], [5, 3], [5, 4],
  [1, 2], [2, 3], [3, 4], [4, 1],
  [0, 6], [5, 7], [1, 6], [3, 7],
];

const STAGE_COLORS = {
  nigredo: "#1f2937",
  albedo: "#e5e7eb",
  citrinitas: "#fbbf24",
  rubedo: "#dc2626",
};

// Vertex component
function Vertex({
  position,
  label,
  symbol,
  index,
  activation,
  onHover,
  colorScheme,
  coherence,
}: {
  position: [number, number, number];
  label: string;
  symbol: string;
  index: number;
  activation: number;
  onHover: (idx: number | null) => void;
  colorScheme: string;
  coherence: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const scale = 0.12 + activation * 0.08;
  const intensity = 0.5 + activation * 1.5;

  const color = colorScheme === "coherence"
    ? new THREE.Color().setHSL(0.5 + coherence * 0.3, 0.8, 0.6)
    : "#06b6d4";

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(scale + Math.sin(state.clock.elapsedTime * 2) * 0.01);
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      onPointerOver={() => { setHovered(true); onHover(index); }}
      onPointerOut={() => { setHovered(false); onHover(null); }}
    >
      <sphereGeometry args={[0.12, 24, 24]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={intensity}
        metalness={0.7}
        roughness={0.3}
      />
      {hovered && <pointLight color={color} intensity={2} distance={2} />}
    </mesh>
  );
}

// Edge component
function Edge({
  start,
  end,
  coherence,
}: {
  start: [number, number, number];
  end: [number, number, number];
  coherence: number;
}) {
  const ref = useRef<THREE.Line>(null);

  const points = useMemo(() => [
    new THREE.Vector3(...start),
    new THREE.Vector3(...end)
  ], [start, end]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    return geo;
  }, [points]);

  const color = new THREE.Color().setHSL(0.5 + coherence * 0.3, 0.7, 0.5);

  useFrame((state) => {
    if (ref.current) {
      const mat = ref.current.material as THREE.LineBasicMaterial;
      mat.opacity = 0.3 + Math.sin(state.clock.elapsedTime) * 0.1;
    }
  });

  return (
    <line ref={ref} geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={0.4} />
    </line>
  );
}

// Toroidal field particles
function ToroidalField({ coherence }: { coherence: number }) {
  const particlesRef = useRef<THREE.Points>(null);
  const particleCount = 500;

  const particles = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 2;
      const r = 2 + Math.random() * 0.3;
      positions[i * 3] = (r + 0.3 * Math.cos(phi)) * Math.cos(theta);
      positions[i * 3 + 1] = 0.3 * Math.sin(phi);
      positions[i * 3 + 2] = (r + 0.3 * Math.cos(phi)) * Math.sin(theta);
    }
    return positions;
  }, []);

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y += 0.002;
    }
  });

  const color = new THREE.Color().setHSL(0.75, 0.6, 0.5);

  return (
    <>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2, 0.3, 16, 64]} />
        <meshStandardMaterial color={color} transparent opacity={0.08} wireframe />
      </mesh>
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={particles}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial color={color} size={0.02} transparent opacity={0.5} />
      </points>
    </>
  );
}

// Coherence sphere at center
function CoherenceSphere({ coherence, stage }: { coherence: number; stage?: string }) {
  const sphereRef = useRef<THREE.Mesh>(null);
  const scale = 0.2 + coherence * 0.3;
  const color = STAGE_COLORS[stage as keyof typeof STAGE_COLORS] || "#f59e0b";

  useFrame((state) => {
    if (sphereRef.current) {
      sphereRef.current.scale.setScalar(scale + Math.sin(state.clock.elapsedTime * 2) * 0.03);
    }
  });

  return (
    <mesh ref={sphereRef}>
      <sphereGeometry args={[0.2, 32, 32]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={coherence * 2}
        transparent
        opacity={0.8}
        metalness={0.9}
        roughness={0.1}
      />
      <pointLight color={color} intensity={coherence * 2} distance={4} />
    </mesh>
  );
}

// Depth markers
function DepthMarkers({ depth }: { depth: number }) {
  const levels = 5;
  return (
    <>
      {Array.from({ length: levels }, (_, i) => {
        const y = -1.5 + (i / (levels - 1)) * 3;
        const opacity = Math.abs(i - depth * (levels - 1) / 7) < 0.8 ? 0.5 : 0.15;
        return (
          <mesh key={i} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[2.2, 2.4, 64]} />
            <meshBasicMaterial color="#06b6d4" transparent opacity={opacity} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
    </>
  );
}

// Labels
function Labels({ showLabels, hoveredVertex }: { showLabels: boolean; hoveredVertex: number | null }) {
  if (!showLabels) return null;

  return (
    <>
      {VERTICES.map((v, i) => (
        <Text
          key={i}
          position={[v.position[0] * 1.4, v.position[1] * 1.4, v.position[2] * 1.4]}
          fontSize={0.15}
          color="#e5e7eb"
          anchorX="center"
          anchorY="middle"
        >
          {hoveredVertex === i ? v.label : v.symbol}
        </Text>
      ))}
    </>
  );
}

// Main scene
function Scene({ state, animate, showLabels, colorScheme }: DiamondVisualizationProps) {
  const [hoveredVertex, setHoveredVertex] = useState<number | null>(null);
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current && animate) {
      groupRef.current.rotation.y += 0.001;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Vertices */}
      {VERTICES.map((v, i) => (
        <Vertex
          key={i}
          position={v.position}
          label={v.label}
          symbol={v.symbol}
          index={i}
          activation={state.dimensions[i] || 0.125}
          onHover={setHoveredVertex}
          colorScheme={colorScheme || "default"}
          coherence={state.coherence}
        />
      ))}

      {/* Edges */}
      {EDGES.map((edge, i) => (
        <Edge
          key={i}
          start={VERTICES[edge[0]].position}
          end={VERTICES[edge[1]].position}
          coherence={state.coherence}
        />
      ))}

      {/* Toroidal field */}
      <ToroidalField coherence={state.coherence} />

      {/* Center coherence sphere */}
      <CoherenceSphere coherence={state.coherence} stage={state.alchemicalStage} />

      {/* Depth markers */}
      <DepthMarkers depth={state.depth} />

      {/* Labels */}
      <Labels showLabels={showLabels ?? true} hoveredVertex={hoveredVertex} />
    </group>
  );
}

// Main component
export function DiamondVisualization(props: DiamondVisualizationProps) {
  const { interactive = true, animate = true, showLabels = true, colorScheme = "default" } = props;

  return (
    <div className="relative h-full w-full min-h-[400px]">
      <Canvas>
        <PerspectiveCamera makeDefault position={[4, 2, 4]} fov={50} />
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={0.6} />
        <pointLight position={[-10, -10, -10]} intensity={0.3} />
        <Scene {...props} animate={animate} showLabels={showLabels} colorScheme={colorScheme} />
        {interactive && (
          <OrbitControls
            enablePan
            enableZoom
            enableRotate
            minDistance={2}
            maxDistance={12}
          />
        )}
      </Canvas>
    </div>
  );
}

export default DiamondVisualization;
