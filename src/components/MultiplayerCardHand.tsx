import { useRef, useState, useEffect } from 'react';
import { Text, PerspectiveCamera } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

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
  { key: 'Wickets_Taken', label: 'Wickets', higher: true },
  { key: 'Batting_Average', label: 'Batting Avg', higher: true },
  { key: 'Economy_Rate', label: 'Economy', higher: false },
  { key: 'Sixes', label: 'Sixes', higher: true },
];

// Helper function to get team color
function getTeamColor(team) {
  const teamColors = {
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

// Multiplayer card hand component
export default function MultiplayerCardHand({ 
  cards, 
  onCardSelect, 
  onStatSelect, 
  isSelectable,
  gamePhase = '',
  currentPlayer = '',
  selectedStat = '',
  players = [],
  playedCards = []
}) {
  const [hoveredCard, setHoveredCard] = useState(null);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [hoveredStat, setHoveredStat] = useState(null);
  
  // Log component render for debugging
  useEffect(() => {
    console.log('MultiplayerCardHand rendering:', {
      player: currentPlayer,
      cardsCount: cards?.length || 0,
      gamePhase,
      isSelectable
    });
  }, [currentPlayer, cards, gamePhase, isSelectable]);
  
  // Handle card selection
  const handleCardClick = (cardId) => {
    if (!isSelectable) return;
    
    setSelectedCardId(cardId);
    if (onCardSelect) {
      onCardSelect(cardId);
    }
  };
  
  // Handle stat selection
  const handleStatClick = (stat) => {
    if (!isSelectable || gamePhase !== 'stat_selection') {
      console.log('Stat selection blocked:', { isSelectable, gamePhase, stat });
      return;
    }
    
    console.log('Stat selected:', stat);
    if (onStatSelect) {
      onStatSelect(stat);
    }
  };
  
  // Safety checks
  if (!cards || !Array.isArray(cards) || cards.length === 0) {
    console.log("MultiplayerCardHand: No cards provided.");
    return null;
  }
  
  // Ensure playedCards is an array and has the expected structure
  const safePlayedCards = Array.isArray(playedCards) ? playedCards.filter(card => 
    card && typeof card === 'object' && card.playerId && card.card
  ) : [];
  
  // Ensure players is an array
  const safePlayers = Array.isArray(players) ? players : [currentPlayer];
  
  // Responsive scaling from viewport like single player
  const { size } = useThree();
  const scale = Math.min(1, size.width / 1200);

  return (
    <group scale={[scale, scale, scale]}>
      <PerspectiveCamera 
        makeDefault 
        position={[-0.02, 1.6, 8.56]} 
        rotation={[-0.18, 0, 0]}
        fov={35} 
      />
      
      {/* Game table */}
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
        
        {/* Table decorations */}
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
      
      {/* All players' cards - positioned around the table */}
      {safePlayers.map((playerName, playerIndex) => {
        const isCurrentPlayerHand = playerName === currentPlayer;
        const playerCards = isCurrentPlayerHand ? cards : [];
        
        // Calculate player position around the table
        let playerAngle, playerX, playerZ, rotationY;
        
        if (isCurrentPlayerHand) {
          // Current player at the bottom
          playerAngle = Math.PI;
          playerX = 0;
          playerZ = TABLE_RADIUS - 1;
          rotationY = 0;
        } else {
          // Position opponents around the table
          const otherPlayerCount = players.length - 1;
          const otherPlayerIndex = playerIndex < players.indexOf(currentPlayer) ? 
                                   playerIndex : 
                                   playerIndex - 1;
          
          if (otherPlayerCount === 1) {
            playerAngle = 0; // Single opponent directly across
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
            {/* Player name */}
            <Text
              position={[0, 0.2, 0]}
              fontSize={0.2}
              color={isCurrentPlayerHand ? "#4ade80" : "white"}
              anchorX="center"
              anchorY="middle"
              fontWeight="bold"
              rotation={[0, isCurrentPlayerHand ? 0 : Math.PI, 0] as [number, number, number]}
            >
              {playerName} {isCurrentPlayerHand ? "(Your Turn)" : ""}
            </Text>
            
            {/* Player's cards */}
            <group position={[0, 0, 0.5]}>
              {isCurrentPlayerHand ? (
                // Current player's cards - with interaction
                cards.map((card, cardIndex) => {
          const isHovered = hoveredCard === card._id;
          const isSelected = selectedCardId === card._id;
          
          // Calculate hand width like single player
          const handWidth = Math.min(cards.length * (CARD_WIDTH + 0.15), 3.0);
          const xPos = ((cardIndex / Math.max(cards.length - 1, 1)) - 0.5) * handWidth;
          
          return (
            <group 
              key={card._id}
              position={[xPos, 0, 0]}
              onClick={() => isSelectable && handleCardClick(card._id)}
              onPointerOver={() => setHoveredCard(card._id)}
              onPointerOut={() => setHoveredCard(null)}
            >
              {/* Card base */}
              <mesh scale={[CARD_WIDTH, CARD_HEIGHT, 0.01]}>
                <boxGeometry />
                <meshStandardMaterial color={getTeamColor(card.team)} />
              </mesh>
              
              {/* Player name */}
              <Text
                position={[0, 0.4, 0.01]}
                fontSize={0.08}
                color="white"
                anchorX="center"
                anchorY="middle"
                fontWeight="bold"
              >
                {card.Player_Name}
              </Text>
              
              {/* Team name */}
              <Text
                position={[0, 0.3, 0.01]}
                fontSize={0.06}
                color="#f0f0f0"
                anchorX="center"
                anchorY="middle"
              >
                {card.team || 'Unknown'}
              </Text>
              
              {/* Stats - always show during stat selection phase */}
              {gamePhase === 'stat_selection' && (
                <group position={[0, 0, 0.02]}>
                  {['Batting_Average', 'Runs_Scored', 'Wickets_Taken', 'Economy_Rate', 'Batting_Strike_Rate'].map((stat, statIndex) => {
                    const isStatHovered = hoveredStat === stat;
                    return (
                      <group 
                        key={stat}
                        position={[0, 0.1 - statIndex * 0.1, 0]}
                        onPointerOver={() => setHoveredStat(stat)}
                        onPointerOut={() => setHoveredStat(null)}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatClick(stat);
                        }}
                      >
                        <mesh position={[0, 0, 0]} scale={[0.6, 0.08, 0.01]}>
                          <boxGeometry />
                          <meshStandardMaterial color={isStatHovered ? '#1e88e5' : '#0d47a1'} />
                        </mesh>
                        <Text
                          position={[-0.2, 0, 0.01]}
                          fontSize={0.04}
                          color="white"
                          anchorX="left"
                          anchorY="middle"
                        >
                          {stat.replace(/_/g, ' ')}
                        </Text>
                        <Text
                          position={[0.25, 0, 0.01]}
                          fontSize={0.04}
                          color="white"
                          anchorX="right"
                          anchorY="middle"
                          fontWeight="bold"
                        >
                          {card[stat]?.toString() || '0'}
                        </Text>
                      </group>
                    );
                  })}
                </group>
              )}
            </group>
          );
                })
              ) : (
                // Opponent cards - face down
                [...Array(3)].map((_, cardIndex) => {
                  const x = ((cardIndex / 2) - 0.5) * 1.5;
                  return (
                    <group key={`opponent-${playerName}-${cardIndex}`} position={[x, 0, 0]}>
                      <mesh scale={[CARD_WIDTH, CARD_HEIGHT, 0.01]} rotation={[Math.PI/6, Math.PI, 0] as [number, number, number]}>
                        <boxGeometry />
                        <meshStandardMaterial color="#1e3a8a" />
                      </mesh>
                    </group>
                  );
                })
              )}
            </group>
          </group>
        );
      })}
      
      {/* Played cards in the center */}
      {safePlayedCards.length > 0 && (
        <group>
          {safePlayedCards.map((playedCard, index) => {
            // Calculate position in a circular arrangement
            const totalPlayed = playedCards.length;
            const angle = (index / Math.max(totalPlayed - 1, 1) - 0.5) * Math.PI * 0.6;
            const radius = 1.2;
            const x = Math.sin(angle) * radius;
            const z = Math.cos(angle) * radius * 0.5;
            
            // Determine if this card is the leading card
            const isLeading = playedCard.isLeading;
            
            return (
              <group key={`played-${playedCard.playerId}-${index}`}>
                {/* Player name above card */}
                <Text
                  position={[x, 0.25, z]}
                  fontSize={0.08}
                  color={isLeading ? "#4ade80" : "#ffffff"}
                  anchorX="center"
                  anchorY="middle"
                  fontWeight="bold"
                >
                  {playedCard.playerId}
                </Text>
                
                {/* The played card */}
                <group position={[x, 0.1, z]}>
                  <mesh scale={[CARD_WIDTH, CARD_HEIGHT, 0.01]} rotation={[0, Math.PI, 0] as [number, number, number]}>
                    <boxGeometry />
                    <meshStandardMaterial color={getTeamColor(playedCard.card?.team)} />
                  </mesh>
                  
                  {/* Card content */}
                  <Text
                    position={[0, 0.4, 0.01]}
                    fontSize={0.08}
                    color="white"
                    anchorX="center"
                    anchorY="middle"
                    fontWeight="bold"
                  >
                    {playedCard.card?.Player_Name || 'Unknown'}
                  </Text>
                  
                  {/* Selected stat highlight */}
                  {selectedStat && (
                    <group position={[0, 0, 0.02]}>
                      <mesh position={[0, 0, 0]} scale={[0.6, 0.08, 0.01]}>
                        <boxGeometry />
                        <meshStandardMaterial color={isLeading ? '#4ade80' : '#1e88e5'} />
                      </mesh>
                      <Text
                        position={[-0.2, 0, 0.01]}
                        fontSize={0.04}
                        color="white"
                        anchorX="left"
                        anchorY="middle"
                      >
                        {selectedStat.replace(/_/g, ' ')}
                      </Text>
                      <Text
                        position={[0.25, 0, 0.01]}
                        fontSize={0.04}
                        color="white"
                        anchorX="right"
                        anchorY="middle"
                        fontWeight="bold"
                      >
                        {(playedCard.card && selectedStat && playedCard.card[selectedStat] !== undefined) ? playedCard.card[selectedStat].toString() : '0'}
                      </Text>
                    </group>
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
