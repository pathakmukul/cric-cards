import { useGameStore } from '../store/gameStore';
import { Text, PerspectiveCamera, Image } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { getTeamDecoration } from './decorations/TeamDecorations';

const CARD_WIDTH = 0.7;
const CARD_HEIGHT = 1.0;
const TABLE_RADIUS = 4;

// Define stat categories by player type
const BATSMAN_STATS = [
  { key: 'Batting_Average', label: 'Batting Avg', higher: true },
  { key: 'Batting_Strike_Rate', label: 'Strike Rate', higher: true },
  { key: 'Runs_Scored', label: 'Runs', higher: true },
  { key: 'Centuries', label: 'Centuries', higher: true },
  { key: 'Half_Centuries', label: 'Half Centuries', higher: true },
];

const BOWLER_STATS = [
  { key: 'Wickets_Taken', label: 'Wickets', higher: true },
  { key: 'Economy_Rate', label: 'Economy', higher: false },
  { key: 'Bowling_Average', label: 'Bowling Avg', higher: false },
  { key: 'Bowling_Strike_Rate', label: 'Bowl SR', higher: false },
  { key: 'Four_Wicket_Hauls', label: 'Four Wickets', higher: true },
];

const ALLROUNDER_STATS = [
  { key: 'Runs_Scored', label: 'Runs', higher: true },
  { key: 'Batting_Strike_Rate', label: 'Bat SR', higher: true },
  { key: 'Wickets_Taken', label: 'Wickets', higher: true },
  { key: 'Economy_Rate', label: 'Economy', higher: false },
  { key: 'Sixes', label: 'Sixes', higher: true },
];

// Function to determine player type based on stats
const determinePlayerType = (card: any): 'batsman' | 'bowler' | 'allrounder' => {
  const stats = card.stats || card;
  
  // Check if it's primarily a bowler
  if (
    (stats.Wickets_Taken > 30 || stats.Bowling_Average < 25 || stats.Economy_Rate < 7.5) &&
    stats.Runs_Scored < 1000
  ) {
    return 'bowler';
  }
  
  // Check if it's primarily a batsman
  if (
    (stats.Runs_Scored > 1000 || stats.Batting_Average > 30 || stats.Centuries > 1) &&
    stats.Wickets_Taken < 20
  ) {
    return 'batsman';
  }
  
  // Otherwise it's an all-rounder
  return 'allrounder';
};

// Function to get the appropriate stats for a player type
const getStatsForPlayerType = (playerType: 'batsman' | 'bowler' | 'allrounder') => {
  switch (playerType) {
    case 'batsman': return BATSMAN_STATS;
    case 'bowler': return BOWLER_STATS;
    case 'allrounder': return ALLROUNDER_STATS;
    default: return BATSMAN_STATS;
  }
};

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
  const scale = Math.min(1, size.width / 1200);
  const groupRef = useRef<THREE.Group>(null);
  const { activeBooster, setActiveBooster, playCardWithStat, currentHand, lastWinner } = useGameStore();
  
  const teamColor = getTeamColor(card.team);
  const teamColorDark = darkenColor(teamColor, 0.7);
  const teamColorLight = lightenColor(teamColor, 0.7);
  
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  
  const hoverPosition: [number, number, number] = [
    position[0],
    position[1] + (hovered ? 0.3 : 0),
    position[2] + (hovered ? 1 : 0)
  ];

  const shouldShowStats = !isFaceDown && (
    (isActivePlayer && gamePhase === 'stat_selection') ||
    (isActivePlayer && gamePhase === 'card_selection')
  );
  
  // Check if we're in card selection mode and a stat has already been selected
  const isCardSelectionWithStatChosen = gamePhase === 'card_selection' && currentHand && currentHand.selectedStat;
  
  // Don't allow interactions if the lastWinner notification is showing
  const isInteractionDisabled = lastWinner !== null;
  
  // Determine the player type and get appropriate stats
  const playerType = useMemo(() => determinePlayerType(card), [card]);
  
  // Get the stats to display based on player type and game phase
  const statsToDisplay = useMemo(() => {
    // When in card selection with a stat already chosen, only show that stat
    if (isCardSelectionWithStatChosen && currentHand) {
      return [{ 
        key: currentHand.selectedStat, 
        label: BATSMAN_STATS.find(s => s.key === currentHand.selectedStat)?.label || 
               BOWLER_STATS.find(s => s.key === currentHand.selectedStat)?.label || 
               ALLROUNDER_STATS.find(s => s.key === currentHand.selectedStat)?.label || 
               currentHand.selectedStat,
        higher: !['Economy_Rate', 'Bowling_Average', 'Bowling_Strike_Rate'].includes(currentHand.selectedStat)
      }];
    }
    
    // Otherwise show all stats for the player type
    return getStatsForPlayerType(playerType);
  }, [playerType, isCardSelectionWithStatChosen, currentHand]);
  
  return (
    <group 
      ref={groupRef}
      position={hoverPosition} 
      rotation={rotation}
      scale={[scale, scale, scale]}
      onClick={(e) => {
        // Don't process clicks if the lastWinner notification is showing
        if (isInteractionDisabled || !isActivePlayer) return;
        
        // Direct single-action click handling
        if (gamePhase === 'stat_selection') {
          onSelect();
        } 
        else if (gamePhase === 'card_selection') {
          if (isCardSelectionWithStatChosen && currentHand) {
            // Play card with the already selected stat
            const currentPlayerName = useGameStore.getState().players[useGameStore.getState().currentPlayer];
            playCardWithStat(currentPlayerName, card, currentHand.selectedStat);
          } else {
            // Just select the card
            onSelect();
          }
          e.stopPropagation();
        }
      }}
      onPointerDown={() => {
        if (isActivePlayer && !isInteractionDisabled) {
          setPressed(true);
        }
      }}
      onPointerUp={() => {
        setPressed(false);
      }}
      onPointerOver={() => {
        if (isActivePlayer && !isInteractionDisabled) {
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }
      }}
      onPointerOut={() => {
        setHovered(false);
        setPressed(false);
        document.body.style.cursor = 'auto';
      }}
    >
      {/* Card base with slight rounded corners effect */}
      <group scale={isSelected || hovered ? [1.05, 1.05, 1.05] : (pressed ? [0.98, 0.98, 0.98] : [1, 1, 1])}>
        {/* Main card body */}
        <mesh>
          <boxGeometry args={[CARD_WIDTH, CARD_HEIGHT, 0.05]} />
          <meshStandardMaterial color={isFaceDown ? "#1e3a8a" : teamColor} />
        </mesh>
        
        {/* Card border overlay - making it more prominent */}
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
        {!isFaceDown && (
          getTeamDecoration(card.team, teamColorLight)
        )}

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
            {statsToDisplay.map((stat, idx) => {
              if ((isCardSelectionWithStatChosen && idx >= 1) || (!isCardSelectionWithStatChosen && idx >= 5)) return null;
              
              const yPos = 0.15 - idx * 0.12;
              const canSelectStat = isActivePlayer && (
                (gamePhase === 'stat_selection') ||
                (gamePhase === 'card_selection' && isSelected)
              );
              const isStatSelected = selectedStat === stat.key;
              
              // More modern color scheme
              const bgColor = isStatSelected 
                ? "#4ade80"
                : (activeBooster === 'orange' ? "#f97316" 
                   : activeBooster === 'purple' ? "#a855f7"
                   : activeBooster === 'teamrank' ? "#0ea5e9"
                   : (canSelectStat 
                      ? teamColorDark
                      : card.team === 'CSK' 
                        ? '#C78F00' // Darker gold for CSK
                        : teamColorDark)); // Use teamColorDark for all states
              
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
                        if (isInteractionDisabled) return;
                        e.stopPropagation();
                        
                        // Directly handle stat selection without intermediate steps
                        if (gamePhase === 'stat_selection') {
                          // This is the first phase - directly select the stat
                          onStatSelect && onStatSelect(stat.key);
                        } else if (gamePhase === 'card_selection' && isSelected) {
                          // Card is already selected, play with this stat immediately
                          playCardWithStat(
                            useGameStore.getState().players[useGameStore.getState().currentPlayer],
                            card,
                            stat.key
                          );
                        }
                      }}
                      onPointerOver={() => {
                        if (!isInteractionDisabled) {
                          document.body.style.cursor = 'pointer';
                        }
                      }}
                      onPointerOut={() => {
                        document.body.style.cursor = 'auto';
                      }}
                    >
                      <planeGeometry />
                      <meshBasicMaterial transparent opacity={0} />
                    </mesh>
                  )}
                  
                  {/* Background - non-interactive, just visual */}
                  {(canSelectStat || isStatSelected) && (
                    <mesh position={[0, 0, 0.002]} scale={[CARD_WIDTH * 0.9, 0.09, 0.001]}>
                      <planeGeometry />
                      <meshBasicMaterial 
                        color={bgColor} 
                        transparent
                        opacity={canSelectStat || isStatSelected ? 1.0 : 0.2}
                      />
                    </mesh>
                  )}
                  
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
                    position={[0.25, 0, 0.003]}
                    fontSize={0.05}
                    color={valueColor}
                    anchorX="right"
                    anchorY="middle"
                    fontWeight="bold"
                  >
                    {(() => {
                      // Handle all possible cases where stat value could be located
                      if (card[stat.key] !== undefined) {
                        return card[stat.key].toString();
                      } else if (card.stats && card.stats[stat.key] !== undefined) { 
                        return card.stats[stat.key].toString();
                      } else {
                        // Try to find the key with proper capitalization
                        const adjustedKey = Object.keys(card).find(
                          k => k.toLowerCase() === stat.key.toLowerCase()
                        );
                        return adjustedKey ? card[adjustedKey].toString() : '0';
                      }
                    })()}
                  </Text>
                  
                  {/* Highlight effect for selectable stats */}
                  {canSelectStat && !isStatSelected && (
                    <mesh position={[0, 0, 0.001]} scale={[CARD_WIDTH * 0.9, 0.09, 0.001]}>
                      <planeGeometry />
                      <meshBasicMaterial color="#ffffff" opacity={0.1} transparent />
                    </mesh>
                  )}
                </group>
              );
            })}
          </group>
        )}
        
        {/* Booster indicator with glow effect */}
        {activeBooster && (
          <group position={[0.25, 0.55, 0.055]}>
            <mesh scale={[0.15, 0.15, 0.001]}>
              <circleGeometry />
              <meshBasicMaterial 
                color={
                  activeBooster === 'orange' ? "#f97316" 
                  : activeBooster === 'purple' ? "#a855f7"
                  : "#0ea5e9"
                } 
              />
            </mesh>
            
            <mesh scale={[0.18, 0.18, 0.001]} position={[0, 0, -0.001]}>
              <circleGeometry />
              <meshBasicMaterial 
                color={
                  activeBooster === 'orange' ? "#f97316" 
                  : activeBooster === 'purple' ? "#a855f7"
                  : "#0ea5e9"
                }
                opacity={0.5}
                transparent
              />
            </mesh>
            
            <Text
              position={[0, 0, 0.001]}
              fontSize={0.06}
              color="#ffffff"
              anchorX="center"
              anchorY="middle"
              fontWeight="bold"
            >
              {activeBooster === 'orange' ? "O" : activeBooster === 'purple' ? "P" : "T"}
            </Text>
          </group>
        )}
        
        {/* Selection indicator with animation effect */}
        {isSelected && (
          <>
            <mesh position={[0, 0, -0.02]} scale={[CARD_WIDTH * 1.1, CARD_HEIGHT * 1.1, 0.001]}>
              <ringGeometry args={[0.45, 0.47, 32]} />
              <meshBasicMaterial color="#4ade80" />
            </mesh>
            
            <mesh position={[0, 0, -0.021]} scale={[CARD_WIDTH * 1.15, CARD_HEIGHT * 1.15, 0.001]}>
              <ringGeometry args={[0.48, 0.485, 32]} />
              <meshBasicMaterial color="#4ade80" opacity={0.5} transparent />
            </mesh>
          </>
        )}
      </group>
      
      {/* Card highlight effect when hovered */}
      {hovered && (
        <mesh position={[0, 0, -0.01]} scale={[1.1, 1.1, 0.01]}>
          <boxGeometry />
          <meshBasicMaterial color={teamColor} opacity={0.3} transparent />
        </mesh>
      )}
    </group>
  );
}

// Helper functions for color manipulation
function darkenColor(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  const newR = Math.max(0, Math.floor(r * factor));
  const newG = Math.max(0, Math.floor(g * factor));
  const newB = Math.max(0, Math.floor(b * factor));
  
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

function lightenColor(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  const newR = Math.min(255, Math.floor(r + (255 - r) * factor));
  const newG = Math.min(255, Math.floor(g + (255 - g) * factor));
  const newB = Math.min(255, Math.floor(b + (255 - b) * factor));
  
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
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
    selectedStat,
    selectedCard,
    playCardWithStat,
    resetSelectionState
  } = useGameStore();
  
  return (
    <group>
      <PerspectiveCamera 
        makeDefault 
        position={[-0.02, 1.6, 8.56]} 
        rotation={[-0.18, 0, 0]}
        fov={35} 
      />
      
      <group>
        <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[TABLE_RADIUS, TABLE_RADIUS, 1]}>
          <circleGeometry args={[1, 64]} />
          <meshStandardMaterial color="#0a4b76" />
        </mesh>
        
        <mesh position={[0, -0.55, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[TABLE_RADIUS + 0.2, TABLE_RADIUS + 0.2, 1]}>
          <ringGeometry args={[0.95, 1, 64]} />
          <meshStandardMaterial color="#083759" />
        </mesh>
        
        <mesh position={[0, -0.48, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1, 1]}>
          <circleGeometry args={[0.5, 32]} />
          <meshStandardMaterial color="#0c5d94" />
        </mesh>
        
        {[...Array(8)].map((_, i) => (
          <mesh 
            key={i}
            position={[
              Math.sin((i * Math.PI) / 4) * (TABLE_RADIUS - 0.5),
              -0.49,
              Math.cos((i * Math.PI) / 4) * (TABLE_RADIUS - 0.5)
            ]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[0.2, 0.2, 1]}
          >
            <circleGeometry args={[1, 32]} />
            <meshStandardMaterial color="#0d6ebd" opacity={0.3} transparent />
          </mesh>
        ))}
      </group>
      
      {players.map((playerName, playerIndex) => {
        const playerHand = playerHands[playerName] || [];
        const isCurrentPlayer = playerIndex === currentPlayer;
        
        let playerAngle, playerX, playerZ, rotationY;
        
        if (isCurrentPlayer) {
          playerAngle = Math.PI;
          playerX = 0;
          playerZ = TABLE_RADIUS - 1;
          rotationY = 0;
        } else {
          const otherPlayerCount = players.length - 1;
          const otherPlayerIndex = playerIndex < currentPlayer ? playerIndex : playerIndex - 1;
          
          if (otherPlayerCount === 1) {
            playerAngle = 0;
          } else if (otherPlayerCount === 2) {
            playerAngle = (otherPlayerIndex === 0) ? Math.PI * 0.75 : Math.PI * 1.25;
          } else if (otherPlayerCount === 3) {
            playerAngle = Math.PI * 0.5 + (otherPlayerIndex * Math.PI * 0.5);
            if (playerAngle >= Math.PI * 2) playerAngle -= Math.PI * 2;
          } else {
            playerAngle = (Math.PI * 2 * otherPlayerIndex / otherPlayerCount + Math.PI) % (Math.PI * 2);
          }
          
          playerX = Math.sin(playerAngle) * (TABLE_RADIUS - 1);
          playerZ = Math.cos(playerAngle) * (TABLE_RADIUS - 1);
          rotationY = Math.atan2(playerX, playerZ);
        }
        
        return (
          <group key={playerName} position={[playerX, 0, playerZ]} rotation={[0, rotationY, 0]}>
            <Text
              position={[0, 0.2, 0]}
              fontSize={0.2}
              color={isCurrentPlayer ? "#4ade80" : "white"}
              anchorX="center"
              anchorY="middle"
              fontWeight="bold"
              rotation={[0, isCurrentPlayer ? 0 : Math.PI, 0] as [number, number, number]}
            >
              {playerName} {isCurrentPlayer ? "(Your Turn)" : ""}
            </Text>
            
            <group position={[0, 0, 0.5]}>
              {playerHand.map((card, cardIndex) => {
                const handWidth = Math.min(playerHand.length * (CARD_WIDTH + 0.15), 3.0);
                const x = ((cardIndex / (Math.max(playerHand.length - 1, 1))) - 0.5) * handWidth;
                const isSelected = isCurrentPlayer && selectedCard?.id === card.id;
                const cardRotation: [number, number, number] = isCurrentPlayer 
                  ? [0, 0, 0]
                  : [Math.PI/6, Math.PI, 0];
                
                return (
                  <CricketCard
                    key={card.id}
                    card={card}
                    position={[x, 0, 0]}
                    rotation={cardRotation}
                    isSelected={isSelected}
                    onSelect={() => {
                      if (isCurrentPlayer) {
                        selectCard(card);
                      }
                    }}
                    onStatSelect={(stat) => {
                      selectStat(stat);
                    }}
                    showStats={true}
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
      
      {currentHand && currentHand.playedCards.map((playedCard, index) => {
        // Calculate position in a circular arrangement
        const totalPlayers = currentHand.playedCards.length;
        const angle = (index / Math.max(totalPlayers - 1, 1) - 0.5) * Math.PI * 0.6;
        const radius = 1.2;
        const x = Math.sin(angle) * radius;
        const z = Math.cos(angle) * radius * 0.5;
        
        // Ensure the card is face up and highlight the one that won
        const winnerCard = currentHand.winner === playedCard.playerId;
        
        return (
          <group key={`played-${playedCard.card.id}-${index}`}>
            {/* Add player name above the played card */}
            <Text
              position={[x, 0.25, z]}
              fontSize={0.08}
              color={winnerCard ? "#4ade80" : "#ffffff"}
              anchorX="center"
              anchorY="middle"
              fontWeight="bold"
            >
              {playedCard.playerId}
            </Text>
            
            <CricketCard
              card={playedCard.card}
              position={[x, 0.1, z]}
              rotation={[0, Math.PI, 0] as [number, number, number]}
              isSelected={winnerCard}
              onSelect={() => {}}
              showStats={true}
              isActivePlayer={false}
              gamePhase={gamePhase}
              selectedStat={currentHand.selectedStat}
            />
          </group>
        );
      })}
    </group>
  );
}

function getTeamColor(team?: string): string {
  const teamColors: Record<string, string> = {
    'MI': '#004BA0',
    'CSK': '#FDB913',
    'RCB': '#EC1C24',
    'KKR': '#3A225D',
    'DC': '#0078BC',
    'PBKS': '#ED1B24',
    'RR': '#E60693',
    'SRH': '#FF822A',
    'GT': '#1B2133',
    'LSG': '#32a8a8',
  };
  
  return team && teamColors[team] ? teamColors[team] : '#795548';
}