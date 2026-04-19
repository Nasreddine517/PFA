import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sphere } from "@react-three/drei";
import * as THREE from "three";

const BrainMesh = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);

  const particlePositions = useMemo(() => {
    const positions = new Float32Array(500 * 3);
    for (let i = 0; i < 500; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2.2 + Math.random() * 1.5;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    return positions;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.15;
      meshRef.current.rotation.x = Math.sin(t * 0.1) * 0.1;
    }
    if (glowRef.current) {
      glowRef.current.rotation.y = -t * 0.1;
      glowRef.current.scale.setScalar(1 + Math.sin(t * 0.5) * 0.05);
    }
    if (particlesRef.current) {
      particlesRef.current.rotation.y = t * 0.05;
      particlesRef.current.rotation.x = t * 0.03;
    }
  });

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={1} color="#4A90D9" />
      <pointLight position={[-5, -3, 3]} intensity={0.6} color="#0EA5E9" />
      <pointLight position={[0, -5, -5]} intensity={0.4} color="#4A90D9" />

      <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.5}>
        <Sphere ref={meshRef} args={[1.8, 128, 128]}>
          <MeshDistortMaterial
            color="#4A90D9"
            emissive="#4A90D9"
            emissiveIntensity={0.15}
            roughness={0.3}
            metalness={0.8}
            distort={0.35}
            speed={2}
            transparent
            opacity={0.85}
          />
        </Sphere>
      </Float>

      <Sphere ref={glowRef} args={[2.2, 64, 64]}>
        <meshStandardMaterial
          color="#4A90D9"
          emissive="#4A90D9"
          emissiveIntensity={0.08}
          transparent
          opacity={0.08}
          wireframe
        />
      </Sphere>

      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={500}
            array={particlePositions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.03}
          color="#4A90D9"
          transparent
          opacity={0.6}
          sizeAttenuation
        />
      </points>

      <Sphere args={[0.8, 32, 32]}>
        <meshStandardMaterial
          color="#0EA5E9"
          emissive="#0EA5E9"
          emissiveIntensity={0.5}
          transparent
          opacity={0.3}
        />
      </Sphere>
    </>
  );
};

const Brain3D = () => {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        style={{ background: "transparent" }}
        gl={{ alpha: true, antialias: true }}
      >
        <BrainMesh />
      </Canvas>
    </div>
  );
};

export default Brain3D;
