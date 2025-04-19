import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { getTeamDecoration } from './TeamDecorations';
import * as THREE from 'three';

// List of all IPL teams
const IPL_TEAMS = [
  'CSK',
  'RCB',
  'PBKS',
  'MI',
  'RR',
  'SRH',
  'LSG',
  'GT',
  'KKR',
  'DC'
];

// Team colors for showcasing
const TEAM_COLORS: Record<string, string> = {
  'MI': '#004BA0',
  'CSK': '#FDB913',
  'RCB': '#EC1C24',
  'KKR': '#3A225D',
  'DC': '#0078BC',
  'PBKS': '#ED1B24',
  'RR': '#254AA5',
  'SRH': '#FF822A',
  'GT': '#1B2133',
  'LSG': '#A7D5F6',
};

// Function to get a lighter version of team color
function lightenColor(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  const newR = Math.min(255, Math.floor(r + (255 - r) * factor));
  const newG = Math.min(255, Math.floor(g + (255 - g) * factor));
  const newB = Math.min(255, Math.floor(b + (255 - b) * factor));
  
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

// Card component to display a team decoration
function DecorationCard({ team, position }: { team: string; position: [number, number, number] }) {
  const teamColor = TEAM_COLORS[team] || '#1e40af';
  const teamColorLight = lightenColor(teamColor, 0.7);
  
  return (
    <group position={position}>
      {/* Card base */}
      <mesh>
        <boxGeometry args={[1.2, 1.5, 0.05]} />
        <meshStandardMaterial color={'#ffffff'} />
      </mesh>
      
      {/* Card border */}
      <mesh position={[0, 0, 0.026]} scale={[1.02, 1.02, 1]}>
        <boxGeometry args={[1.2, 1.5, 0.001]} />
        <meshStandardMaterial color={'#000000'} opacity={0.9} transparent />
      </mesh>
      
      {/* Card content area with team color */}
      <mesh position={[0, 0, 0.027]} scale={[0.98, 0.98, 1]}>
        <boxGeometry args={[1.2, 1.5, 0.001]} />
        <meshStandardMaterial color={teamColor} opacity={0.9} transparent />
      </mesh>
      
      {/* Team name at the top */}
      <Text
        position={[0, 0.6, 0.05]}
        fontSize={0.12}
        color={'#ffffff'}
        anchorX={'center'}
        anchorY={'middle'}
        fontWeight={'bold'}
      >
        {team}
      </Text>
      
      {/* Add team decoration - scaled up for better visibility */}
      <group position={[0, 0, 0.03]} scale={[1.5, 1.5, 1.5]}>
        {getTeamDecoration(team, teamColorLight, [0, 0, 0])}
      </group>
    </group>
  );
}

// Main showcase component
export default function TeamDecorationShowcase() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0a2a' }}>
      <Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
        <ambientLight intensity={0.8} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        
        {/* Arrange cards in a grid */}
        <group>
          {IPL_TEAMS.map((team, index) => {
            // Calculate position in a 3x4 grid
            const row = Math.floor(index / 5);
            const col = index % 5;
            const xPos = (col - 2) * 2.5;
            const yPos = (1 - row) * 3;
            
            return (
              <DecorationCard 
                key={team} 
                team={team} 
                position={[xPos, yPos, 0]} 
              />
            );
          })}
        </group>
        
        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
      </Canvas>
      
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: 'white',
        fontFamily: 'Arial',
        fontSize: '16px',
        padding: '10px',
        background: 'rgba(0,0,0,0.5)',
        borderRadius: '5px'
      }}>
        Click and drag to rotate • Scroll to zoom
      </div>
    </div>
  );
} 