// CardHand component for displaying player cards
import { useGameStore } from '../store/gameStore';
import { Text, PerspectiveCamera } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useRef, useState } from 'react';
import * as THREE from 'three';

// Card dimensions - smaller to fit more on screen
const CARD_WIDTH = 0.7;
const CARD_HEIGHT = 1.0;
const TABLE_RADIUS = 4;

// Define the stats we want to display on the cards
const DISPLAY_STATS = [
  { key: 'Batting_Average', label: 'Batting Avg', higher: true },
  { key: 'Batting_Strike_Rate', label: 'Strike Rate', higher: true },
  { key: 'Runs_Scored', label: 'Runs', higher: true },
  { key: 'Centuries', label: 'Centuries', higher: true },
  { key: 'Half_Centuries', label: 'Half Centuries', higher: true },
  { key: 'Wickets_Taken', label: 'Wickets', higher: true },
  { key: 'Economy_Rate', label: 'Economy', higher: false },
  { key: 'Bowling_Average', label: 'Bowling Avg', higher: false },
  { key: 'Sixes', label: 'Sixes', higher: true },
  { key: 'Fours', label: 'Fours', higher: true },
];

interface CardProps {
  card: any;
  position: [number, number, number];
  isSelected: boolean;
  onSelect: () => void;
  onStatSelect?: (statKey: string) => void;
  showStats: boolean;
  isActivePlayer: boolean;
  gamePhase: string;
  rotation?: [number, number, number];
  isFaceDown?: boolean;
  selectedStat?: string | null;
}

function CricketCard({ 
  card, 
  position, 
  isSelected, 
  onSelect, 
  onStatSelect,
  showStats,
  isActivePlayer,
  gamePhase,
  rotation = [0, 0, 0],
  isFaceDown = false,
  selectedStat = null
}: CardProps) {
  const { size } = useThree();
  const scale = Math.min(1, size.width / 1200); // Responsive scaling
  const groupRef = useRef<THREE.Group>(null);
  
  // Get team color for the card
  const teamColor = getTeamColor(card.team);
  
  // State for hover effect
  const [hovered, setHovered] = useState(false);
  
  // Calculate the position with hover effect - move the entire card up
  const hoverPosition: [number, number, number] = [
    position[0],
    position[1] + (hovered ? 0.3 : 0),
    position[2] + (hovered ? 1 : 0) // Move forward on z-axis when hovered
  ];
  
  return (
    <group 
      ref={groupRef}
      position={hoverPosition} 
      rotation={rotation}
      scale={[scale, scale, scale]}
      onClick={(e) => {
        e.stopPropagation();
        if (isActivePlayer && (gamePhase === 'stat_selection' || gamePhase === 'card_selection')) {
          onSelect();
        }
      }}
      onPointerOver={() => {
        if (isActivePlayer) {
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      {/* Card base with subtle elevation when selected or hovered */}
      <mesh
        scale={isSelected || hovered ? [1.05, 1.05, 1.05] : [1, 1, 1]}
      >
        <boxGeometry args={[CARD_WIDTH, CARD_HEIGHT, 0.05]} />
        <meshStandardMaterial color={isFaceDown ? "#1e3a8a" : teamColor} />  
      </mesh>
      
      {/* Card border - brighter when hovered */}
      <mesh position={[0, 0, 0.051]} scale={[0.98, 0.98, 1]}>
        <boxGeometry args={[CARD_WIDTH, CARD_HEIGHT, 0.001]} />
        <meshStandardMaterial 
          color="#ffffff" 
          opacity={hovered ? 0.9 : 0.5} 
          transparent 
        />
      </mesh>
      
      {/* Card glow effect when hovered */}
      {hovered && (
        <mesh position={[0, 0, -0.01]} scale={[1.1, 1.1, 0.01]}>
          <boxGeometry />
          <meshBasicMaterial color={teamColor} opacity={0.3} transparent />
        </mesh>
      )}
      
      {/* Card back design (only visible when face down) */}
      {isFaceDown && (
        <group position={[0, 0, 0.06]}>
          {/* IPL logo or pattern */}
          <mesh position={[0, 0, 0]} scale={[0.5, 0.5, 0.01]}>
            <planeGeometry />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <Text
            position={[0, 0, 0.01]}
            fontSize={0.1}
            color="#ff9933"
            anchorX="center"
            anchorY="middle"
          >
            IPL
          </Text>
        </group>
      )}
      
      {/* Only show card front details if not face down */}
      {!isFaceDown && (
        <>
          {/* Card Header - Dark background for better contrast */}
          <mesh position={[0, 0.6, 0.055]} scale={[CARD_WIDTH, 0.25, 0.001]}>
            <planeGeometry />
            <meshBasicMaterial color="#000000" />
          </mesh>
          
          {/* Player Name */}
          <Text
            position={[0, 0.6, 0.06]}
            fontSize={0.08}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            fontWeight="bold"
            maxWidth={CARD_WIDTH * 0.9}
          >
            {card.Player_Name}
          </Text>
          
          {/* Team Badge */}
          <mesh position={[0, 0.4, 0.06]} scale={[0.2, 0.2, 0.01]}>
            <circleGeometry args={[1, 32]} />
            <meshBasicMaterial color={teamColor} />
          </mesh>
        </>
      )}
      
      {/* Stats - improved layout with better contrast */}
      {showStats && !isFaceDown && (
        <group position={[0, 0, 0.06]}>
          {DISPLAY_STATS.map((stat, idx) => {
            // Only show top 5 stats to avoid cluttering
            if (idx >= 5) return null;
            
            const yPos = 0.15 - idx * 0.15; // Increased spacing between stats
            const canSelectStat = gamePhase === 'stat_selection' && isActivePlayer && isSelected;
            const isStatSelected = selectedStat === stat.key;
            
            // Define colors based on selection state
            const bgColor = isStatSelected 
              ? "#4ade80" // Bright green for selected stat
              : (canSelectStat 
                  ? (idx % 2 === 0 ? "#334477" : "#445588") // Brighter blue for selectable stats
                  : (idx % 2 === 0 ? "#222244" : "#333366")); // Dark blue for non-selectable stats
            
            const textColor = isStatSelected ? "#000000" : "#ffffff";
            const valueColor = isStatSelected ? "#000000" : "#ffcc00";
            
            return (
              <group key={stat.key} position={[0, yPos, 0]}>
                {/* Stat background with selection color */}
                <mesh 
                  position={[0, 0, -0.01]} 
                  scale={[CARD_WIDTH * 0.95, 0.12, 0.01]}
                  onClick={(e) => {
                    if (canSelectStat) {
                      e.stopPropagation();
                      onStatSelect && onStatSelect(stat.key);
                    }
                  }}
                >
                  <planeGeometry />
                  <meshBasicMaterial color={bgColor} />
                </mesh>
                
                {/* Stat row - entire row is clickable */}
                <group 
                  onClick={(e) => {
                    if (canSelectStat) {
                      e.stopPropagation();
                      onStatSelect && onStatSelect(stat.key);
                    }
                  }}
                >
                  {/* Stat label - left aligned */}
                  <Text
                    position={[-0.28, 0, 0]}
                    fontSize={0.06}
                    color={textColor}
                    anchorX="left"
                    anchorY="middle"
                    fontWeight="bold"
                  >
                    {stat.label}:
                  </Text>
                  
                  {/* Stat value - right aligned with bright color for visibility */}
                  <Text
                    position={[0.28, 0, 0]}
                    fontSize={0.06}
                    color={valueColor}
                    anchorX="right"
                    anchorY="middle"
                    fontWeight="bold"
                  >
                    {card.stats[stat.key]?.toString() || '0'}
                  </Text>
                  
                  {/* Highlight for selectable stats */}
                  {canSelectStat && !isStatSelected && (
                    <mesh position={[0, 0, -0.005]} scale={[CARD_WIDTH * 0.95, 0.12, 0.001]}>
                      <planeGeometry />
                      <meshBasicMaterial color="#ffffff" opacity={0.1} transparent />
                    </mesh>
                  )}
                </group>
              </group>
            );
          })}
        </group>
      )}
    </group>
  );
}

export default function CardHand() {
  const { 
    players, 
    currentPlayer, 
    playerHands, 
    gamePhase, 
    selectCard, 
    selectStat,
    currentHand,
    selectedStat
  } = useGameStore();
  
  // Determine if we should show detailed stats
  const showDetailedStats = gamePhase === 'stat_selection';
  
  // Set up a fixed camera to make the view more static
  return (
    <group>
      {/* Fixed camera with exact values from debug - no controls for stability */}
      <PerspectiveCamera 
        makeDefault 
        position={[-0.02, 1.6, 8.56]} 
        rotation={[-0.18, 0, 0]}
        fov={35} 
      />
      
      {/* Table background - larger circular table */}
      <group>
        {/* Table surface */}
        <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[TABLE_RADIUS, TABLE_RADIUS, 1]}>
          <circleGeometry args={[1, 64]} />
          <meshStandardMaterial color="#0a4b76" />
        </mesh>
        
        {/* Table edge */}
        <mesh position={[0, -0.55, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[TABLE_RADIUS + 0.2, TABLE_RADIUS + 0.2, 1]}>
          <ringGeometry args={[0.95, 1, 64]} />
          <meshStandardMaterial color="#083759" />
        </mesh>
        
        {/* Center spot */}
        <mesh position={[0, -0.48, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1, 1]}>
          <circleGeometry args={[0.5, 32]} />
          <meshStandardMaterial color="#0c5d94" />
        </mesh>
      </group>
      
      {/* Display all players' positions around the table */}
      {players.map((playerName, playerIndex) => {
        const playerHand = playerHands[playerName] || [];
        const isCurrentPlayer = playerIndex === currentPlayer;
        
        // Always position current player at the bottom of the table
        let playerAngle, playerX, playerZ, rotationY;
        
        if (isCurrentPlayer) {
          // Current player is always at the bottom
          playerAngle = Math.PI; // Bottom of the circle
          playerX = 0;
          playerZ = TABLE_RADIUS - 1; // Position at the bottom (away from the camera)
          rotationY = 0; // No rotation needed to face outward
        } else {
          // Position other players evenly around the rest of the table in a full 360 setup
          const otherPlayerCount = players.length - 1;
          const otherPlayerIndex = playerIndex < currentPlayer ? playerIndex : playerIndex - 1;
          
          // Simple fixed positions for other players based on total count
          if (otherPlayerCount === 1) {
            // One other player - place at the top
            playerAngle = 0; // Top of the circle
          } else if (otherPlayerCount === 2) {
            // Two other players - place at top-left and top-right
            playerAngle = (otherPlayerIndex === 0) ? Math.PI * 0.75 : Math.PI * 1.25;
          } else if (otherPlayerCount === 3) {
            // Three other players - place at left, top, and right
            playerAngle = Math.PI * 0.5 + (otherPlayerIndex * Math.PI * 0.5);
            if (playerAngle >= Math.PI * 2) playerAngle -= Math.PI * 2;
          } else {
            // Four or more other players - distribute evenly
            playerAngle = (Math.PI * 2 * otherPlayerIndex / otherPlayerCount + Math.PI) % (Math.PI * 2);
          }
          
          playerX = Math.sin(playerAngle) * (TABLE_RADIUS - 1);
          playerZ = Math.cos(playerAngle) * (TABLE_RADIUS - 1);
          
          // Calculate rotation to face outward from table
          rotationY = Math.atan2(playerX, playerZ); // Face outward from center
        }
        
        return (
          <group key={playerName} position={[playerX, 0, playerZ]} rotation={[0, rotationY, 0]}>
            {/* Player name indicator */}
            <Text
              position={[0, 0.2, 0]}
              fontSize={0.2}
              color={isCurrentPlayer ? "#4ade80" : "white"}
              anchorX="center"
              anchorY="middle"
              fontWeight="bold"
              rotation={[0, isCurrentPlayer ? 0 : Math.PI, 0] as [number, number, number]} // Fix text orientation
            >
              {playerName} {isCurrentPlayer ? "(Your Turn)" : ""}
            </Text>
            
            {/* Player's cards */}
            <group position={[0, 0, 0.5]}>
              {playerHand.map((card, cardIndex) => {
                // Calculate position in a fan arrangement
                const handWidth = Math.min(playerHand.length * (CARD_WIDTH + 0.05), 2.5);
                const x = ((cardIndex / (Math.max(playerHand.length - 1, 1))) - 0.5) * handWidth;
                
                // Check if this card is selected
                const isSelected = isCurrentPlayer && cardIndex === currentPlayer;
                
                // For current player, cards face up and outward from table
                // For other players, cards face down and outward from table
                const cardRotation: [number, number, number] = isCurrentPlayer 
                  ? [0, 0, 0] // Current player's cards face outward with no rotation
                  : [Math.PI/6, Math.PI, 0]; // Other players' cards face outward with rotation
                
                return (
                  <CricketCard
                    key={card.id}
                    card={card}
                    position={[x, 0, 0]}
                    rotation={cardRotation}
                    isSelected={isSelected}
                    onSelect={() => isCurrentPlayer && selectCard(card)}
                    onStatSelect={(stat) => selectStat(stat)}
                    showStats={isCurrentPlayer && (showDetailedStats || isSelected)}
                    isActivePlayer={isCurrentPlayer}
                    gamePhase={gamePhase}
                    isFaceDown={!isCurrentPlayer}
                    selectedStat={selectedStat}
                  />
                );
              })}
            </group>
          </group>
        );
      })}
      
      {/* Display cards played in the current hand - in center of table */}
      {currentHand && (
        <group position={[0, 0, 0]}>
          <Text
            position={[0, 0.8, 0]}
            fontSize={0.25}
            color="#f7fafc"
            anchorX="center"
            anchorY="middle"
            fontWeight="bold"
            rotation={[0, 0, 0] as [number, number, number]} // Text readable from camera position
          >
            Current Hand - {currentHand.selectedStat}
          </Text>
          
          {/* Played cards in a neat arrangement */}
          {currentHand.playedCards.map((playedCard, index) => {
            // Arrange in a semi-circle facing the camera
            const angle = (index / (currentHand.playedCards.length - 1 || 1) - 0.5) * Math.PI * 0.6;
            const radius = 1.2;
            const x = Math.sin(angle) * radius;
            const z = Math.cos(angle) * radius * 0.5; // Position toward the camera
            
            return (
              <CricketCard
                key={`played-${playedCard.card.id}`}
                card={playedCard.card}
                position={[x, 0.1, z]}
                rotation={[0, Math.PI, 0] as [number, number, number]} // Cards face the camera
                isSelected={false}
                onSelect={() => {}}
                showStats={true}
                isActivePlayer={false}
                gamePhase={gamePhase}
              />
            );
          })}
        </group>
      )}
    </group>
  );
}

function getTeamColor(team?: string): string {
  const teamColors: Record<string, string> = {
    'Mumbai Indians': '#004BA0',
    'Chennai Super Kings': '#FDB913', // Brighter yellow
    'Royal Challengers Bangalore': '#EC1C24',
    'Kolkata Knight Riders': '#3A225D',
    'Delhi Capitals': '#0078BC', // Brighter blue
    'Punjab Kings': '#ED1B24',
    'Rajasthan Royals': '#254AA5',
    'Sunrisers Hyderabad': '#FF822A',
    'Gujarat Titans': '#1B2133',
    'Lucknow Super Giants': '#A7D5F6',
  };
  
  // Default to a nice blue if team not found
  return team && teamColors[team] ? teamColors[team] : '#1e40af';
}