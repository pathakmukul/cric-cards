import React, { useState } from 'react';
import { Text } from '@react-three/drei';
import { getTeamDecoration } from '../decorations/TeamDecorations';

// Constants
const CARD_WIDTH = 0.7;
const CARD_HEIGHT = 1.0;

// Color utility functions
function lightenColor(color: string, factor = 0.5) {
  // Lighten a hex color by factor (0-1)
  const hex = color.replace('#', '');
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);
  
  r = Math.min(255, r + Math.floor((255 - r) * factor));
  g = Math.min(255, g + Math.floor((255 - g) * factor));
  b = Math.min(255, b + Math.floor((255 - b) * factor));
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function darkenColor(color: string, factor = 0.5) {
  // Darken a hex color by factor (0-1)
  const hex = color.replace('#', '');
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);
  
  r = Math.max(0, r - Math.floor(r * factor));
  g = Math.max(0, g - Math.floor(g * factor));
  b = Math.max(0, b - Math.floor(b * factor));
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Helper function to get team color
function getTeamColor(team?: string) {
  const teamColors: Record<string, string> = {
    'Mumbai Indians': '#004BA0',
    'MI': '#004BA0',
    'Chennai Super Kings': '#FDB913',
    'CSK': '#FDB913',
    'Royal Challengers Bangalore': '#EC1C24',
    'RCB': '#EC1C24',
    'Kolkata Knight Riders': '#3A225D',
    'KKR': '#3A225D',
    'Delhi Capitals': '#0078BC',
    'DC': '#0078BC',
    'Punjab Kings': '#ED1B24',
    'PBKS': '#ED1B24',
    'Rajasthan Royals': '#254AA5',
    'RR': '#254AA5',
    'Sunrisers Hyderabad': '#FF822A',
    'SRH': '#FF822A',
    'Gujarat Titans': '#1B2133',
    'GT': '#1B2133',
    'Lucknow Super Giants': '#A7D5F6',
    'LSG': '#A7D5F6',
  };
  return team && teamColors[team] ? teamColors[team] : '#795548';
}

export interface CardComponentProps {
  card: any;
  isSelected?: boolean;
  isHovered?: boolean;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  isFaceDown?: boolean;
  onClick?: () => void;
  onHover?: (hovered: boolean) => void;
  gamePhase?: string;
  selectedStat?: string;
  statOptions?: Array<{ key: string, label: string, higher: boolean }>;
  onStatSelect?: (stat: string) => void;
  isSelectable?: boolean;
  isActivePlayer?: boolean;
  activeBooster?: string | null;
}

export const CardComponent: React.FC<CardComponentProps> = ({
  card,
  isSelected = false,
  isHovered = false,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1.0,
  isFaceDown = false,
  onClick,
  onHover,
  gamePhase = '',
  selectedStat = '',
  statOptions = [],
  onStatSelect,
  isSelectable = true,
  isActivePlayer = false,
  activeBooster = null
}) => {
  // Local state for hovering stat elements
  const [hoveredStat, setHoveredStat] = useState<string | null>(null);
  
  // Calculate team colors
  const teamColor = getTeamColor(card.team);
  const teamColorDark = darkenColor(teamColor, 0.7);
  const teamColorLight = lightenColor(teamColor, 0.7);
  
  // Check if we should show stats (front of card, and relevant game phases)
  const shouldShowStats = !isFaceDown && (
    (isActivePlayer && gamePhase === 'stat_selection') ||
    (isActivePlayer && gamePhase === 'card_selection')
  );
  
  // Check if we're in card selection mode and a stat has already been chosen
  const isCardSelectionWithStatChosen = gamePhase === 'card_selection' && selectedStat;
  
  // Scale based on hover/selected state
  const cardScale = isSelected || isHovered ? [1.05, 1.05, 1.05] : [1, 1, 1];
  
  return (
    <group 
      position={position}
      rotation={rotation}
      scale={[scale, scale, scale]}
      onClick={(e) => { 
        console.log("🔴 CardComponent onClick for:", card._id);
        e.stopPropagation(); 
        onClick && onClick(); 
      }}
      onPointerOver={() => onHover && onHover(true)}
      onPointerOut={() => onHover && onHover(false)}
    >
      <group scale={cardScale}>
        {/* Main card body */}
        <mesh>
          <boxGeometry args={[CARD_WIDTH, CARD_HEIGHT, 0.05]} />
          <meshStandardMaterial color={isFaceDown ? "#1e3a8a" : teamColor} />
        </mesh>
        
        {/* Card border overlay */}
        <mesh position={[0, 0, 0.026]} scale={[1.02, 1.02, 1]}>
          <boxGeometry args={[CARD_WIDTH, CARD_HEIGHT, 0.001]} />
          <meshStandardMaterial color={isFaceDown ? "#0f2465" : "#000000"} opacity={0.9} transparent />
        </mesh>
        
        {/* Inner card content area */}
        <mesh position={[0, 0, 0.027]} scale={[0.98, 0.98, 1]}>
          <boxGeometry args={[CARD_WIDTH, CARD_HEIGHT, 0.001]} />
          <meshStandardMaterial color={isFaceDown ? "#1e3a8a" : teamColor} opacity={0.9} transparent />
        </mesh>

        {/* Team-specific decorative elements - directly on the team color background */}
        {!isFaceDown && getTeamDecoration(card.team, teamColorLight)}

        {/* Card back design */}
        {isFaceDown && (
          <group position={[0, 0, 0.06]}>
            {/* Logo background */}
            <mesh position={[0, 0, 0]} scale={[0.4, 0.4, 0.01]} rotation={[0, 0, Math.PI / 4]}>
              <planeGeometry />
              <meshBasicMaterial color="#0f2465" opacity={0.7} transparent />
            </mesh>
            
            {/* IPL Logo */}
            <mesh position={[0, 0, 0.001]} scale={[0.35, 0.35, 0.01]}>
              <planeGeometry />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            
            <Text
              position={[0, 0, 0.01]}
              fontSize={0.12}
              color="#ff9933"
              anchorX="center"
              anchorY="middle"
            >
              IPL
            </Text>
            
            {/* Decorative elements */}
            {[...Array(8)].map((_, i) => (
              <mesh 
                key={i} 
                position={[
                  Math.sin((i * Math.PI) / 4) * 0.3,
                  Math.cos((i * Math.PI) / 4) * 0.3,
                  0
                ]}
                scale={[0.05, 0.05, 0.01]}
              >
                <circleGeometry />
                <meshBasicMaterial color="#ff9933" opacity={0.7} transparent />
              </mesh>
            ))}
          </group>
        )}
        
        {/* Card front design */}
        {!isFaceDown && (
          <>
            {/* Team header with gradient */}
            <mesh position={[0, 0.4, 0.052]} scale={[CARD_WIDTH, 0.25, 0.001]}>
              <planeGeometry />
              <meshBasicMaterial color={teamColor} />
            </mesh>
            
            <mesh position={[0, 0.275, 0.053]} scale={[CARD_WIDTH, 0.05, 0.001]}>
              <planeGeometry />
              <meshBasicMaterial color={teamColorDark} />
            </mesh>
            
            {/* Team name */}
            <Text
              position={[0, 0.45, 0.055]}
              fontSize={0.06}
              color="#ffffff"
              anchorX="center"
              anchorY="middle"
              fontWeight="bold"
            >
              {card.team}
            </Text>
            
            {/* Player name with stylish background */}
            <mesh position={[0, 0.33, 0.054]} scale={[CARD_WIDTH * 0.85, 0.1, 0.001]}>
              <planeGeometry />
              <meshBasicMaterial color="#000000" opacity={0.6} transparent />
            </mesh>
            
            <Text
              position={[0, 0.33, 0.055]}
              fontSize={0.06}
              color="#ffffff"
              anchorX="center"
              anchorY="middle"
              fontWeight="bold"
              maxWidth={CARD_WIDTH * 0.8}
            >
              {card.Player_Name}
            </Text>
            
            {/* Decorative line under player name */}
            <mesh position={[0, 0.27, 0.054]} scale={[CARD_WIDTH * 0.7, 0.003, 0.001]}>
              <planeGeometry />
              <meshBasicMaterial color="#ffffff" opacity={0.7} transparent />
            </mesh>
          </>
        )}
        
        {/* Stats section with modern styling */}
        {shouldShowStats && (
          <group position={[0, 0, 0.06]}>
            {statOptions.map((stat, idx) => {
              if ((isCardSelectionWithStatChosen && idx >= 1) || (!isCardSelectionWithStatChosen && idx >= 5)) return null;
              
              const yPos = 0.15 - idx * 0.12;
              const canSelectStat = isActivePlayer && (
                (gamePhase === 'stat_selection') ||
                (gamePhase === 'card_selection' && isSelected)
              );
              const isStatSelected = selectedStat === stat.key;
              const isStatHovered = hoveredStat === stat.key;
              
              // Modern color scheme
              const bgColor = isStatSelected 
                ? "#4ade80" // Selected color
                : (activeBooster === 'orange' ? "#f97316" 
                   : activeBooster === 'purple' ? "#a855f7"
                   : activeBooster === 'teamrank' ? "#0ea5e9"
                   : (canSelectStat 
                      ? teamColor // Use the regular team color instead of dark version
                      : card.team === 'CSK' 
                        ? '#FFCC00' // Brighter gold for CSK
                        : teamColor)); // Use regular team color for all states
              
              const textColor = isStatSelected ? "#000000" : "#ffffff";
              const valueColor = isStatSelected ? "#000000" : "#ffcc00";
              
              return (
                <group key={stat.key} position={[0, yPos, 0]}>
                  {/* Main clickable mesh - BIGGER and positioned on TOP */}
                  {canSelectStat && (
                    <mesh 
                      position={[0, 0, 0.1]} 
                      scale={[CARD_WIDTH * 0.9, 0.09, 0.01]}
                      onClick={(e) => {
                        e.stopPropagation();
                        onStatSelect && onStatSelect(stat.key);
                      }}
                      onPointerOver={() => setHoveredStat(stat.key)}
                      onPointerOut={() => setHoveredStat(null)}
                    >
                      <planeGeometry />
                      <meshBasicMaterial 
                        color={isStatHovered ? "#ffffff" : "#00000000"} 
                        opacity={0.0001} 
                        transparent 
                      />
                    </mesh>
                  )}
                  
                  {/* Stat background */}
                  <mesh position={[0, 0, 0]} scale={[CARD_WIDTH * 0.8, 0.08, 0.01]}>
                    <planeGeometry />
                    <meshBasicMaterial color={bgColor} opacity={0.9} transparent />
                  </mesh>
                  
                  {/* Stat label */}
                  <Text
                    position={[-0.25, 0, 0.003]}
                    fontSize={0.045}
                    color={textColor}
                    anchorX="left"
                    anchorY="middle"
                    fontWeight="bold"
                  >
                    {stat.label}:
                  </Text>
                  
                  {/* Stat value */}
                  <Text
                    position={[CARD_WIDTH * 0.3, 0, 0.01]}
                    fontSize={0.04}
                    color={valueColor}
                    anchorX="right"
                    anchorY="middle"
                    fontWeight="bold"
                  >
                    {card[stat.key]?.toString() || '0'}
                  </Text>
                </group>
              );
            })}
          </group>
        )}
      </group>
    </group>
  );
};

export default CardComponent;
