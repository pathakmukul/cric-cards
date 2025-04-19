import React, { useMemo } from 'react';
import * as THREE from 'three';
import { TextureLoader, Blending, NormalBlending, AdditiveBlending } from 'three';

// Define the props for the generic component
interface TeamSvgDecorationProps {
  position: [number, number, number];
  opacity: number;
  svgPath: string;
  teamColor: string;
  blending?: Blending; // Optional blending mode override
  materialTintColor?: string; // Optional override for the main material's tint
}

// Generic component for rendering team SVG decorations
const TeamSvgDecoration: React.FC<TeamSvgDecorationProps> = ({
  position,
  opacity,
  svgPath,
  teamColor,
  blending = THREE.AdditiveBlending, // Default to AdditiveBlending
  materialTintColor // Destructure the new prop
}) => {
  const texture = useMemo(() => {
    const loader = new TextureLoader();
    // Add error handling for texture loading
    try {
      const loadedTexture = loader.load(svgPath, undefined, undefined, (err) => {
        console.error(`Error loading texture for ${svgPath}:`, err);
      });
      // Ensure texture filtering is appropriate for SVGs
      loadedTexture.minFilter = THREE.LinearFilter;
      loadedTexture.magFilter = THREE.LinearFilter;
      loadedTexture.generateMipmaps = false; // Usually not needed for UI textures
      return loadedTexture;
    } catch (error) {
      console.error(`Failed to initiate texture loading for ${svgPath}:`, error);
      return null; // Return null or a placeholder texture on error
    }
  }, [svgPath]);

  // Don't render if texture failed to load
  if (!texture) {
    return null; 
  }

  // Determine the tint color for the main material
  const mainMaterialColor = materialTintColor || teamColor;

  return (
    <group position={position}>
      {/* Extra border mesh */}
      <mesh position={[0, 0, -0.001]} scale={[1.03, 1.03, 1]}>
        <planeGeometry args={[0.85, 0.85]} />
        <meshBasicMaterial
          transparent
          opacity={opacity * 0.5}
          color={teamColor} // Border always uses teamColor
        />
      </mesh>

      {/* Main SVG display */}
      <mesh>
        <planeGeometry args={[0.85, 0.85]} />
        <meshBasicMaterial
          map={texture}
          transparent
          opacity={opacity * 2.5}
          color={mainMaterialColor} // Use the determined tint color
          blending={blending} // Use specified or default blending
          // depthWrite={false} // Keep commented out for now
        />
      </mesh>
    </group>
  );
};

// Team configurations: svg path, color, optional blending override, optional tint override
const teamConfigs: Record<string, { 
  svgPath: string; 
  color: string; 
  blending?: Blending; 
  materialTintColor?: string; 
}> = {
  CSK:  { svgPath: '/chn.svg', color: '#e8da00', blending: THREE.NormalBlending }, 
  RCB:  { svgPath: '/blr.svg', color: '#FF1C24' },
  PBKS: { svgPath: '/pnb.svg', color: '#ED1B24' },
  MI:   { svgPath: '/mi.svg',  color: '#0065AA', blending: THREE.NormalBlending }, 
  RR:   { svgPath: '/rr.svg',  color: '#E60693' },
  SRH:  { svgPath: '/srh.svg', color: '#FF822A', blending: THREE.NormalBlending }, 
  LSG:  { svgPath: '/lsg.svg', color: '#32a8a8' }, 
  GT:   { svgPath: '/gt.svg',  color: '#1B2133', materialTintColor: '#ffffff' }, // Override tint to white
  KKR:  { svgPath: '/kkr.svg', color: '#552583' },
  DC:   { svgPath: '/dc.svg',  color: '#D71921', blending: THREE.NormalBlending, materialTintColor: '#ffffff' }, // Override tint to white
};

// Updated function to get team-specific decoration elements
export const getTeamDecoration = (team?: string, teamColorLight?: string, position: [number, number, number] = [0, -0.1, 0.028]) => {
  const opacity = 0.15;

  // Check if we have a configuration for this team
  if (team && teamConfigs[team]) {
    const config = teamConfigs[team];
    return (
      <TeamSvgDecoration
        position={position}
        opacity={opacity}
        svgPath={config.svgPath}
        teamColor={config.color} // Base color for border
        blending={config.blending} 
        materialTintColor={config.materialTintColor} // Pass the override tint color
      />
    );
  }

  // Default decoration for unknown teams or if no team is provided
  const defaultColor = teamColorLight || '#795548';
  // Use TeamSvgDecoration with def.svg for the default case
  return (
    <TeamSvgDecoration
      position={position}
      opacity={opacity}
      svgPath={'/def.svg'} // Corrected path to def.svg
      teamColor={defaultColor} // Use defaultColor for border
      blending={THREE.NormalBlending} // Use NormalBlending for default
      materialTintColor={'#795548'} // Show SVG's internal color (white)
    />
  );
};