import { useGameStore } from '../store/gameStore';
import { Text, PerspectiveCamera, Image, useTexture, Html } from '@react-three/drei';
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
  const gameStore = useGameStore();
  const cardBackTexture = useTexture('/assets/cardback.png');
  
  const teamColor = getTeamColor(card.team);
  const teamColorDark = darkenColor(teamColor, 0.7);
  const teamColorLight = lightenColor(teamColor, 0.7);
  
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  
  const hoverPosition: [number, number, number] = [
    position[0],
    position[1] + (hovered && isActivePlayer ? 0.15 : 0),
    position[2] + (hovered && isActivePlayer ? 0.3 : 0)
  ];

  const shouldShowStats = !isFaceDown;
  
  const isCardSelectionWithStatChosen = gamePhase === 'card_selection' && gameStore.currentHand?.selectedStat;
  
  const isInteractionDisabled = gameStore.lastWinner !== null || !isActivePlayer;
  
  const playerType = useMemo(() => determinePlayerType(card), [card]);
  
  const statsToDisplay = useMemo(() => {
    return getStatsForPlayerType(playerType);
  }, [playerType]);
  
  return (
    <group 
      ref={groupRef}
      position={hoverPosition} 
      rotation={rotation}
      scale={[scale, scale, scale]}
      onClick={(e) => {
        if (isInteractionDisabled) return;
        
        if (gamePhase === 'stat_selection') {
          onSelect();
        } 
        else if (gamePhase === 'card_selection') {
           if (isCardSelectionWithStatChosen && gameStore.currentHand) { 
              const currentPlayerName = gameStore.players[gameStore.currentPlayer];
              gameStore.playCardWithStat(currentPlayerName, card, gameStore.currentHand.selectedStat);
           } else {
              onSelect();
           }
           e.stopPropagation(); 
        }
      }}
      onPointerDown={() => {
        if (!isInteractionDisabled) {
          setPressed(true);
        }
      }}
      onPointerUp={() => {
        if (!isInteractionDisabled) {
            setPressed(false);
        }
      }}
      onPointerOver={() => {
        if (!isInteractionDisabled) {
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
      <group scale={isSelected ? [1.05, 1.05, 1.05] : (pressed && !isInteractionDisabled ? [0.98, 0.98, 0.98] : [1, 1, 1])}>
        <mesh>
          <boxGeometry args={[CARD_WIDTH, CARD_HEIGHT, 0.05]} />
          <meshStandardMaterial color={isFaceDown ? "#1e3a8a" : teamColor} />
        </mesh>
        
        <mesh position={[0, 0, 0.026]} scale={[1.02, 1.02, 1]}>
          <boxGeometry args={[CARD_WIDTH, CARD_HEIGHT, 0.001]} />
          <meshStandardMaterial color={isFaceDown ? "#0f2465" : "#000000"} opacity={0.9} transparent />
        </mesh>
        
        <mesh position={[0, 0, 0.027]} scale={[0.98, 0.98, 1]}>
          <boxGeometry args={[CARD_WIDTH, CARD_HEIGHT, 0.001]} />
          <meshStandardMaterial color={isFaceDown ? "#1e3a8a" : teamColor} opacity={0.9} transparent />
        </mesh>

        {!isFaceDown && (
          getTeamDecoration(card.team, teamColorLight)
        )}

        {isFaceDown && (
          <mesh position={[0, 0, 0.028]} scale={[0.98, 0.98, 1]}>
            <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
            <meshBasicMaterial 
              map={cardBackTexture}
            />
          </mesh>
        )}
        
        {!isFaceDown && (
          <>
            <mesh position={[0, 0.4, 0.052]} scale={[CARD_WIDTH, 0.25, 0.001]}>
              <planeGeometry />
              <meshBasicMaterial color={teamColor} />
            </mesh>
            
            <mesh position={[0, 0.275, 0.053]} scale={[CARD_WIDTH, 0.05, 0.001]}>
              <planeGeometry />
              <meshBasicMaterial color={teamColorDark} />
            </mesh>
            
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
            
            <mesh position={[0, 0.27, 0.054]} scale={[CARD_WIDTH * 0.7, 0.003, 0.001]}>
              <planeGeometry />
              <meshBasicMaterial color="#ffffff" opacity={0.7} transparent />
            </mesh>
          </>
        )}
        
        {shouldShowStats && (
          <group position={[0, 0, 0.06]}>
            {statsToDisplay.map((stat, idx) => {
              if (idx >= 5) return null;
              
              const yPos = 0.15 - idx * 0.12;
              const canSelectStat = !isInteractionDisabled && (
                (gamePhase === 'stat_selection') ||
                (gamePhase === 'card_selection' && isSelected)
              );
              const isStatSelected = selectedStat === stat.key;
              
              const currentActiveBooster = gameStore.activeBooster;
              
              const bgColor = isStatSelected 
                ? "#4ade80"
                : (currentActiveBooster === 'orange' ? "#f97316" 
                   : currentActiveBooster === 'purple' ? "#a855f7"
                   : currentActiveBooster === 'teamrank' ? "#0ea5e9"
                   : (canSelectStat 
                      ? teamColorDark
                      : card.team === 'CSK' 
                        ? '#C78F00'
                        : teamColorDark));
              
              const textColor = isStatSelected ? "#000000" : "#ffffff";
              const valueColor = isStatSelected ? "#000000" : "#ffcc00";
              
              return (
                <group key={stat.key} position={[0, yPos, 0]}>
                  {canSelectStat && (
                    <mesh 
                      position={[0, 0, 0.1]} 
                      scale={[CARD_WIDTH * 0.9, 0.09, 0.01]}
                      onClick={(e) => {
                        if (isInteractionDisabled) return;
                        
                        e.stopPropagation();
                        
                        if (gamePhase === 'stat_selection') {
                          onStatSelect && onStatSelect(stat.key);
                        } else if (gamePhase === 'card_selection' && isSelected) {
                          gameStore.playCardWithStat(
                            gameStore.players[gameStore.currentPlayer],
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
                  
                  <mesh position={[0, 0, 0.002]} scale={[CARD_WIDTH * 0.9, 0.09, 0.001]}>
                      <planeGeometry />
                      <meshBasicMaterial 
                        color={bgColor} 
                        transparent
                        opacity={1.0}
                      />
                  </mesh>
                  
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
                  
                  <Text
                    position={[0.25, 0, 0.003]}
                    fontSize={0.05}
                    color={valueColor}
                    anchorX="right"
                    anchorY="middle"
                    fontWeight="bold"
                  >
                    {(() => {
                      if (card[stat.key] !== undefined) {
                        return card[stat.key].toString();
                      } else if (card.stats && card.stats[stat.key] !== undefined) { 
                        return card.stats[stat.key].toString();
                      } else {
                        const adjustedKey = Object.keys(card).find(
                          k => k.toLowerCase() === stat.key.toLowerCase()
                        );
                        return adjustedKey ? card[adjustedKey].toString() : '0';
                      }
                    })()}
                  </Text>
                  
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
        
        {gameStore.activeBooster && (
          <group position={[0.25, 0.55, 0.055]}>
            <mesh scale={[0.15, 0.15, 0.001]}>
              <circleGeometry />
              <meshBasicMaterial 
                color={
                  gameStore.activeBooster === 'orange' ? "#f97316" 
                  : gameStore.activeBooster === 'purple' ? "#a855f7"
                  : "#0ea5e9"
                } 
              />
            </mesh>
            
            <mesh scale={[0.18, 0.18, 0.001]} position={[0, 0, -0.001]}>
              <circleGeometry />
              <meshBasicMaterial 
                color={
                  gameStore.activeBooster === 'orange' ? "#f97316" 
                  : gameStore.activeBooster === 'purple' ? "#a855f7"
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
              {gameStore.activeBooster === 'orange' ? "O" : gameStore.activeBooster === 'purple' ? "P" : "T"}
            </Text>
          </group>
        )}
        
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
      
      {hovered && (
        <mesh position={[0, 0, -0.01]} scale={[1.1, 1.1, 0.01]}>
          <boxGeometry />
          <meshBasicMaterial color={teamColor} opacity={0.3} transparent />
        </mesh>
      )}
    </group>
  );
}

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
    lastWinner 
  } = useGameStore();
  
  const { size } = useThree();
  const scale = Math.min(1, size.width / 1200);
  
  const humanPlayerIndex = players.indexOf("You"); 
  const fixedHumanIndex = humanPlayerIndex === -1 ? 0 : humanPlayerIndex;
  const isMyTurn = players[currentPlayer] === "You";
  const showWaitingIndicator = !isMyTurn && gamePhase && gamePhase !== 'waiting' && !lastWinner;

  return (
    <group>
      <PerspectiveCamera 
        makeDefault 
        position={[-0.02, 1.6, 8.56]} 
        rotation={[-0.18, 0, 0]}
        fov={35} 
      />
      
      {/* Waiting indicator */}
      {showWaitingIndicator && (
        <Html
          center
          position={[0, 1, 0]}
          style={{
            width: '300px',
            height: '120px',
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '50%', 
            border: '3px solid rgba(59, 130, 246, 0.3)',
            borderTopColor: '#3b82f6',
            animation: 'spin 1s linear infinite',
            marginBottom: '12px'
          }} className="animate-spin" />
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            .animate-spin {
              animation: spin 1s linear infinite;
            }
          `}</style>
          <div style={{ 
            color: 'white', 
            fontFamily: 'sans-serif', 
            fontWeight: 'bold',
            fontSize: '16px',
            textAlign: 'center'
          }}>
            Waiting for {players[currentPlayer]}'s move...
          </div>
        </Html>
      )}
      
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
        const isCurrentTurnPlayer = playerIndex === currentPlayer; 
        const isHumanPlayer = playerName === "You";
        
        let playerAngle, playerX, playerZ, rotationY;
        
        const angleIncrement = (Math.PI * 2) / players.length; 
        playerAngle = playerIndex * angleIncrement;

        const radius = TABLE_RADIUS * 0.8;
        playerX = Math.sin(playerAngle) * radius;
        playerZ = Math.cos(playerAngle) * radius;
        
        // Adjust rotation to ensure card backs are visible from all angles
        // Main player has no rotation, opponent has PI, side players need PI/2 or -PI/2
        if (playerName === "You") {
          rotationY = 0; // No rotation for human player
        } else {
          // Calculate rotation to face the center
          rotationY = Math.PI + Math.atan2(playerX, playerZ);
        }
        
        return (
          <group key={playerName} position={[playerX, 0, playerZ]} rotation={[0, rotationY, 0]}>
            <Text
              position={[0, CARD_HEIGHT * 0.7, 0.1]}
              fontSize={0.18}
              color={isCurrentTurnPlayer ? "#4ade80" : "white"}
              anchorX="center"
              anchorY="middle"
              fontWeight="bold"
              // rotation={[0, Math.PI, 0]} 
              rotation={[0, playerName === "You" ? 0 : -rotationY, 0]}

            >
              {playerName} {isCurrentTurnPlayer ? "(Turn)" : ""}
            </Text>
            
            <group position={[0, 0, 0]}> 
              {playerHand.map((card, cardIndex) => {
                const handWidth = Math.min(playerHand.length * (CARD_WIDTH + 0.15), 2.5);
                const x = ((cardIndex / (Math.max(playerHand.length - 1, 1))) - 0.5) * handWidth;
                const isSelectedForHuman = isHumanPlayer && isCurrentTurnPlayer && selectedCard?.id === card.id;
                
                const cardRotation: [number, number, number] = 
                    isHumanPlayer ? [0.1, 0, 0] : [0, 0, 0]; 
                
                return (
                  <CricketCard
                    key={card.id}
                    card={card}
                    position={[x, 0, 0]}
                    rotation={cardRotation}
                    isSelected={isSelectedForHuman}
                    onSelect={() => {
                      if (isHumanPlayer && isCurrentTurnPlayer) {
                        selectCard(card);
                      }
                    }}
                    onStatSelect={(stat) => {
                      if (isHumanPlayer && isCurrentTurnPlayer) {
                        selectStat(stat);
                      }
                    }}
                    showStats={true}
                    isActivePlayer={isHumanPlayer && isCurrentTurnPlayer && !lastWinner} 
                    gamePhase={gamePhase}
                    isFaceDown={!isHumanPlayer} 
                    selectedStat={selectedStat} 
                  />
                );
              })}
            </group>
          </group>
        );
      })}
      
      {/* Remove the played cards display from the center of the board */}
      {/* Keeping the logic but commenting it out in case it's needed later */}
      {/*
      {currentHand && currentHand.playedCards.map((playedCard, index) => {
        const totalPlayed = currentHand.playedCards.length;
        const radius = 1.0;
        const angleOffset = -Math.PI / 2;
        const angle = angleOffset + (index / totalPlayed) * Math.PI * 2;

        const x = Math.sin(angle) * radius;
        const z = Math.cos(angle) * radius - radius * 0.5;
        const y = -0.6;
        
        const isLeading = currentHand.leadingCard?.playerId === playedCard.playerId;
        
        return (
          <group key={`played-${playedCard.card.id}-${index}`}>
            <Text
              position={[x, y + CARD_HEIGHT * 0.65, z + 0.1]}
              fontSize={0.12}
              color={isLeading ? "#FFD700" : "#ffffff"} 
              anchorX="center"
              anchorY="middle"
              fontWeight="bold"
              rotation={[0, Math.PI, 0]}
            >
              {playedCard.playerId}
            </Text>
            
            <CricketCard
              card={playedCard.card}
              position={[x, y, z]} 
              rotation={[0, Math.PI, 0]}
              isSelected={isLeading} 
              onSelect={() => {}} 
              showStats={true} 
              isActivePlayer={false} 
              gamePhase={gamePhase} 
              selectedStat={currentHand.selectedStat} 
              isFaceDown={false} 
            />
          </group>
        );
      })}
      */}
    </group>
  );
}

function getTeamColor(team?: string): string {
  const teamColors: Record<string, string> = {
    'MUM': '#004BA0',
    'CHE': '#FDB913',
    'BLR': '#EC1C24',
    'KOL': '#3A225D',
    'DEL': '#0078BC',
    'PUN': '#ED1B24',
    'RAJ': '#254AA5',
    'HYD': '#FF822A',
    'GUJ': '#1B2133',
    'LKN': '#A7D5F6',
  };
  return team && teamColors[team] ? teamColors[team] : '#795548';
}