import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const ProfessionalBackground = ({ isDarkMode }) => {
  const meshRef = useRef();

  // Color logic based on theme
  // Dark mode: subtle blue/grey wireframe
  // Light mode: soft grey wireframe
 const wireframeColor = isDarkMode ? '#8a8989' : '#777777';
  const glowColor = isDarkMode ? '#000000' : '#ffffff';

  // Static background - no animation

  return (
    <group position={[2, -1.5, 0]}> {/* Positions the sphere in the bottom right */}
      <mesh ref={meshRef}>
        {/* IcosahedronGeometry creates a beautiful "technical" triangular mesh.
          Detail level 2 or 3 is perfect for wireframes.
        */}
        <icosahedronGeometry args={[4, 2]} /> 
        
        <meshBasicMaterial
          color={wireframeColor}
          wireframe={true}
          transparent={true}
          opacity={isDarkMode ? 0.3 : 0.4}
        />
      </mesh>

      {/* Optional: A very faint solid core to prevent seeing through completely if desired */}
      <mesh scale={[0.99, 0.99, 0.99]}>
        <icosahedronGeometry args={[4, 2]} />
        <meshBasicMaterial
          color={glowColor}
          transparent={true}
          opacity={isDarkMode ? 0.1 : 0.1}
        />
      </mesh>
    </group>
  );
};

export default ProfessionalBackground;
