import React, { Suspense, useEffect, useState, useRef, useMemo, memo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { useQuery, useMutation } from 'convex/react'; // Import Convex hooks
import { api } from '../../convex/_generated/api'; // Import Convex API
import { Id, Doc } from '../../convex/_generated/dataModel'; // Import Convex types
import MultiplayerCardHand from './MultiplayerCardHand';
import { motion } from 'framer-motion';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Loader2, AlertTriangle, LogOut, Trophy, Clock } from 'lucide-react'; // Added icons

// Import components from GameBoard and decorations
import { BoosterButton, PlayedCardDisplay } from './GameBoard';
import { getTeamDecoration } from './decorations/TeamDecorations';

// Type definitions (can be shared or defined here)
type BoosterType = "orange" | "purple" | "teamrank";
type PlayerScoresMap = Record<string, number>;
type PlayerHandsMap = Record<string, Array<Id<"iplstats">>>; // For backend data structure
type PlayerBoostersMap = Record<string, { orange: boolean, purple: boolean, teamrank: boolean }>;

// Interface for card data expected by CardHand component
interface PlayerCardData {
  _id: Id<"iplstats">;
  Player_Name: string;
  team?: string;
  Runs_Scored: number;
  Batting_Average: number | string;
  Batting_Strike_Rate: number | string;
  Centuries: number;
  Half_Centuries: number;
  Sixes: number;
  Fours: number;
  Highest_Score: string | number;
  Wickets_Taken: number;
  Economy_Rate: number | string;
  Bowling_Average: number | string;
  Bowling_Strike_Rate: number | string;
  Four_Wicket_Hauls: number;
  Five_Wicket_Hauls: number;
}

// --- Helper Functions (Keep as they are UI related) ---
const getTeamColor = (team?: string): string => {
  const teamColors: Record<string, string> = {
    'Mumbai Indians': '#004BA0',
    'Chennai Super Kings': '#FDB913',
    'Royal Challengers Bangalore': '#EC1C24',
    'Kolkata Knight Riders': '#3A225D',
    'Delhi Capitals': '#0078BC',
    'Punjab Kings': '#ED1B24',
    'Rajasthan Royals': '#254AA5',
    'Sunrisers Hyderabad': '#FF822A',
    'Gujarat Titans': '#1B2133',
    'Lucknow Super Giants': '#A7D5F6',
  };
  return team && teamColors[team] ? teamColors[team] : '#1e40af';
};

// Helper to format game phase for display
const formatGamePhase = (phase: string): string => {
  switch (phase) {
    case 'waiting': return 'Waiting for Players';
    case 'stat_selection': return 'Select Stat';
    case 'card_selection': return 'Select Card';
    case 'round_end': return 'Round End';
    case 'game_over': return 'Game Over';
    default: return phase.replace(/_/g, ' ');
  }
};

const formatStatLabel = (statKey: string): string => {
  if (!statKey) return 'Unknown'; // Handle null/undefined case
  const statLabels: Record<string, string> = {
    'Wickets_Taken': 'Wickets', 'Runs_Scored': 'Runs', 'Batting_Average': 'Batting Avg',
    'Batting_Strike_Rate': 'Strike Rate', 'Bowling_Average': 'Bowling Avg', 'Bowling_Strike_Rate': 'Bowl SR',
    'Economy_Rate': 'Economy', 'Centuries': 'Centuries', 'Half_Centuries': 'Half Centuries',
    'Sixes': 'Sixes', 'Fours': 'Fours', 'Highest_Score': 'Highest Score',
    'Four_Wicket_Hauls': 'Four Wickets', 'Five_Wicket_Hauls': 'Five Wickets'
  };
  return statLabels[statKey] || statKey.replace(/_/g, ' ');
};

const formatStatValue = (value: number | undefined, statKey: string): string => {
  if (value === undefined || value === null) return '0'; // Handle undefined value
  const integerStats = ['Wickets_Taken', 'Runs_Scored', 'Centuries', 'Half_Centuries', 'Sixes', 'Fours', 'Four_Wicket_Hauls', 'Five_Wicket_Hauls'];
  if (integerStats.includes(statKey)) { return Math.round(value).toString(); }
  // Ensure value is a number before calling toFixed
  return typeof value === 'number' ? value.toFixed(2) : '0';
};

// Previous component definitions now imported from GameBoard

// BoosterButton is now imported from GameBoard.tsx


// --- Main Multiplayer Game Board Component ---

// Define the interface for MultiplayerCardHand props
interface MultiplayerCardHandProps {
  cards: PlayerCardData[];
  onCardSelect: (cardId: Id<"iplstats">) => void;
  onStatSelect?: (statKey: string) => void;
  isSelectable: boolean;
  gamePhase?: string;
  currentPlayer?: string;
  selectedStat?: string;
}

// Memoized components to prevent unnecessary re-renders
const GameTable = memo(() => {
  return (
    <group>
      {/* Game table - Always rendered */}
      <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[4, 4, 1]}>
        <circleGeometry args={[1, 64]} />
        <meshStandardMaterial color="#0a4b76" />
      </mesh>
      
      <mesh position={[0, -0.55, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[4.2, 4.2, 1]}>
        <ringGeometry args={[0.95, 1, 64]} />
        <meshStandardMaterial color="#083759" />
      </mesh>
      
      <mesh position={[0, -0.48, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1, 1]}>
        <circleGeometry args={[0.5, 32]} />
        <meshStandardMaterial color="#0c5d94" />
      </mesh>
    </group>
  );
});

// Memoized card hand component
const MemoizedCardHand = memo(MultiplayerCardHand, (prevProps, nextProps) => {
  // Only re-render when these specific props change
  return (
    prevProps.gamePhase === nextProps.gamePhase &&
    prevProps.isSelectable === nextProps.isSelectable &&
    prevProps.selectedStat === nextProps.selectedStat &&
    prevProps.cards.length === nextProps.cards.length &&
    prevProps.playedCards.length === nextProps.playedCards.length &&
    JSON.stringify(prevProps.leadingCardInfo) === JSON.stringify(nextProps.leadingCardInfo)
  );
});

export default function MultiplayerGameBoard() {
  const navigate = useNavigate();
  // Get URL parameters and localStorage values
  const { lobbyId: lobbyIdParam } = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const playerNameFromUrl = searchParams.get('player');
  const lobbyIdFromUrl = searchParams.get('lobbyId');
  const lobbyIdFromStorage = typeof window !== 'undefined' ? localStorage.getItem('cricCards_lobbyId') : '';
  const playerNameFromStorage = typeof window !== 'undefined' ? localStorage.getItem('cricCards_playerName') : '';
  
  // Use URL params first, then route params, then storage, then fallback
  const lobbyId = lobbyIdFromUrl || lobbyIdParam || lobbyIdFromStorage || '';
  const [playerName, setPlayerName] = useState<string>(playerNameFromUrl || playerNameFromStorage || '');

  // Redirect to lobby if missing info
  useEffect(() => {
    if (!lobbyId || !playerName) {
      setTimeout(() => {
        // Redirect to home page instead of lobby on error
        navigate('/');
      }, 1000);
    }
  }, [lobbyId, playerName, navigate]);
  const [selectedStat, setSelectedStat] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<Id<"iplstats"> | null>(null);
  const [activeBooster, setActiveBooster] = useState<BoosterType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionId] = useState(() => Math.random().toString(36).substring(2, 10)); // Generate a random session ID
  const [timeLeft, setTimeLeft] = useState<number>(15); // Timer for turns
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Get Player and Lobby Info ---
  const lobbyData = useQuery(api.multiplayer.getLobbyData, lobbyId ? { lobbyId } : "skip");
  const makeMove = useMutation(api.multiplayer.makeMove);
  // checkBotMoves is triggered by the backend scheduler via makeMove, no need to call from frontend

  // Get current player's hand IDs from lobbyData
  const userCardIds = useMemo(() => {
    if (lobbyData && playerName && lobbyData.playerHands) {
      // Ensure playerHands is treated as the correct map type
      const handsMap = lobbyData.playerHands as PlayerHandsMap;
      const playerCards = handsMap[playerName] || [];
      console.log(`[Player Cards] ${playerName} has ${playerCards.length} cards:`, playerCards);
      return playerCards;
    }
    return [];
  }, [lobbyData, playerName]);

  // Fetch details for the current player's hand cards
  const userHandCardsData = useQuery(
      api.cards.getCardDetails,
      userCardIds.length > 0 ? { cardIds: userCardIds } : "skip"
  );

  // After fetching hand data, cache the last known cards to prevent unmount flicker
  const [cachedHand, setCachedHand] = useState<PlayerCardData[]>([]);
  useEffect(() => {
    if (userHandCardsData && userHandCardsData.length > 0) {
      setCachedHand(userHandCardsData as PlayerCardData[]);
    }
  }, [userHandCardsData]);

  // --- Derived State from Lobby Data ---
  // Use useMemo to prevent unnecessary recalculations
  const gameState = useMemo(() => {
    return {
      gamePhase: lobbyData?.gamePhase,
      currentPlayer: lobbyData?.currentPlayer,
      players: lobbyData?.players ?? [],
      playerScores: (lobbyData?.playerScores as PlayerScoresMap) ?? {},
      playerBoosters: (lobbyData?.playerBoosters as PlayerBoostersMap) ?? {},
      playerHands: (lobbyData?.playerHands as PlayerHandsMap) ?? {},
      currentHandPlayedCards: lobbyData?.currentHand?.playedCards || [],
      leadingCardInfo: lobbyData?.currentHand?.leadingCard, // Can be object or undefined
      selectedStat: lobbyData?.selectedStat // Fixed to use the root-level selectedStat
    };
  }, [lobbyData]);
  
  const gamePhase = gameState.gamePhase;
  const currentPlayer = gameState.currentPlayer;
  const players = gameState.players;
  const playerScores = gameState.playerScores;
  const playerBoosters = gameState.playerBoosters;
  const playerHands = gameState.playerHands;
  const userBoosters = playerBoosters[playerName] || { orange: false, purple: false, teamrank: false };
  const isMyTurn = currentPlayer === playerName;
  const currentHandPlayedCards = gameState.currentHandPlayedCards;
  const gameOver = gamePhase === 'game_over';
  const leadingCardInfo = gameState.leadingCardInfo;

  // Log gamePhase whenever lobbyData updates
  useEffect(() => {
    if (lobbyData) {
      console.log('[Debug] Lobby updated. Game phase:', lobbyData.gamePhase);
    }
  }, [lobbyData]);

  // Log game state for debugging
  useEffect(() => {
    console.log('Game State Update:', {
      playerName,
      currentPlayer,
      isMyTurn,
      gamePhase,
      selectedStat,
      cardsCount: userCardIds.length,
      cardsLoaded: !!userHandCardsData
    });
  }, [playerName, currentPlayer, isMyTurn, gamePhase, selectedStat, userCardIds, userHandCardsData]);

  // Log the gameOver variable value
  useEffect(() => {
    console.log('[Debug] gameOver variable:', gameOver);
  }, [gameOver]);
  
  // Track if an auto-play is in progress to prevent duplicate actions
  const autoPlayInProgressRef = useRef(false);
  
  // Timer logic for player turns
  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Reset auto-play flag when turn/phase changes
    autoPlayInProgressRef.current = false;
    
    // Only start timer when it's player's turn and in an active phase
    if (isMyTurn && (gamePhase === 'stat_selection' || gamePhase === 'card_selection')) {
      // Reset timer to 15 seconds
      setTimeLeft(15);
      
      // Start countdown
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          const newTime = prev - 1;
          
          // If time runs out, auto-play
          if (newTime <= 0) {
            // Clear timer
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            
            // Only proceed if another auto-play isn't already in progress
            if (!autoPlayInProgressRef.current && userHandCardsData?.length > 0) {
              // Set flag to prevent duplicate actions
              autoPlayInProgressRef.current = true;
              
              try {
                // Auto-play logic with error handling
                if (gamePhase === 'stat_selection') {
                  // Use the first card in hand to determine best stats
                  const card = userHandCardsData[0];
                  
                  // Import the function from MultiplayerCardHand
                  // This avoids circular imports by using the same logic at runtime
                  let bestStats;
                  try {
                    // First try to use the imported function if available
                    const { getBestStatsForCard } = require('./MultiplayerCardHand');
                    bestStats = getBestStatsForCard(card);
                  } catch (e) {
                    // Fallback to basic stats if import fails
                    const playerType = card.Wickets_Taken > 50 ? 'bowler' : 
                                      card.Runs_Scored > 1000 ? 'batsman' : 'allrounder';
                    
                    bestStats = playerType === 'batsman' ? 
                      ['Batting_Average', 'Batting_Strike_Rate', 'Runs_Scored'] :
                      playerType === 'bowler' ? 
                      ['Wickets_Taken', 'Economy_Rate', 'Bowling_Average'] :
                      ['Runs_Scored', 'Wickets_Taken', 'Batting_Average'];
                  }
                  
                  // Select the best stat for this card
                  const bestStat = bestStats[0] || 'Batting_Average'; // Fallback
                  console.log(`[Auto-play] Timer expired - Auto-selecting best stat: ${bestStat}`);
                  handleStatSelection(bestStat);
                } else if (gamePhase === 'card_selection') {
                  // Auto-play first card
                  const firstCardId = userHandCardsData[0]._id;
                  console.log(`[Auto-play] Timer expired - Auto-playing card: ${firstCardId}`);
                  // Need to use a synthetic event structure for stopPropagation
                  handleCardSelection(firstCardId, { stopPropagation: () => {} } as React.MouseEvent);
                }
              } catch (error) {
                console.error('[Auto-play] Error during auto-play:', error);
                // Reset flag if auto-play failed
                autoPlayInProgressRef.current = false;
              }
            }
          }
          
          return Math.max(0, newTime);
        });
      }, 1000);
    } else {
      // Not player's turn, reset timer display
      setTimeLeft(15);
    }
    
    // Cleanup on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isMyTurn, gamePhase, userHandCardsData]);

  // Initial waiting overlay: show before gamePhase/currentPlayer ready
  const handToRender = (userHandCardsData && userHandCardsData.length > 0)
    ? (userHandCardsData as PlayerCardData[])
    : cachedHand;

  // --- Action Handlers ---
  const handleStatSelection = async (stat: string, cardId?: Id<"iplstats">) => {
    // Extra validation
    if (!isMyTurn || gamePhase !== 'stat_selection' || !lobbyId || !playerName) {
        console.warn("Stat selection attempt failed validation:", { isMyTurn, gamePhase, lobbyId, playerName });
        return;
    }
    setError(null);
    try {
      console.log(`[UI] Selecting Stat: ${stat}`);
      
      // If this is a one-click solution (stat + card), use the combined action
      if (cardId) {
        console.log('One-click solution detected - using combined select_and_play action');
        
        // Create a combined action that handles both stat selection and card play atomically
        const combinedMoveData: any = {
          lobbyId,
          playerName,
          action: "select_and_play" as const,
          selectedStat: stat,
          selectedCardId: cardId,
        };
        
        // Only add useBooster if it's a valid value
        if (activeBooster === "orange" || activeBooster === "purple" || activeBooster === "teamrank") {
          combinedMoveData.useBooster = activeBooster;
        }
        
        console.log('Making combined select_and_play move:', combinedMoveData);
        await makeMove(combinedMoveData);
        console.log(`Combined action complete: Stat=${stat}, Card=${cardId}`);
        setActiveBooster(null); // Reset booster after playing
      } 
      // For regular stat selection without immediately playing a card
      else {
        const statMoveData = {
          lobbyId,
          playerName,
          action: "select_stat" as const,
          selectedStat: stat,
        };
        console.log('Making stat selection move:', statMoveData);
        await makeMove(statMoveData);
      }
      
      // State updates are handled by useQuery re-fetching lobbyData
    } catch (err: any) {
      console.error("Failed to perform action:", err);
      setError(`Error: ${err.message || err}`);
    }
  };

  const handleCardSelection = async (cardId: Id<"iplstats">, e?: React.MouseEvent | React.PointerEvent) => {
    // Stop event propagation to prevent duplicate calls - crucial fix for card play errors
    if (e) e.stopPropagation();
    
    console.log("🔵 handleCardSelection fired for:", cardId);
    // Extra validation
     if (!isMyTurn || gamePhase !== 'card_selection' || !lobbyId || !playerName) {
        console.warn("Card selection attempt failed validation:", { isMyTurn, gamePhase, lobbyId, playerName });
        return;
     }
     
     // In card selection phase, we don't need selectedStat to be set
     console.log("Card selection validation passed", { cardId, gamePhase, selectedStat });
    setError(null);
    try {
      console.log(`[UI] Playing Card: ${cardId} with Booster: ${activeBooster}`);
      
      // Show what we're sending to the server
      // Only include useBooster if it has a valid value (not null or undefined)
      const moveData: any = {
        lobbyId,
        playerName,
        action: "play_card",
        selectedCardId: cardId,
      };
      
      // Only add useBooster if it's a valid value
      if (activeBooster === "orange" || activeBooster === "purple" || activeBooster === "teamrank") {
        moveData.useBooster = activeBooster;
      }
      console.log('Making move with data:', moveData);
      
      await makeMove(moveData);
      console.log(`Card played: ${cardId}`);
      setActiveBooster(null); // Reset local booster selection after playing card
    } catch (err: any) {
      console.error("Failed to play card:", err);
      setError(`Error playing card: ${err.message || err}`);
    }
  };

  const handleBoosterToggle = (booster: BoosterType) => {
    // Can only toggle if it's your turn, in card selection phase, and the booster is available
    if (!isMyTurn || gamePhase !== 'card_selection' || !userBoosters[booster]) return;
    setActiveBooster(current => current === booster ? null : booster); // Toggle active booster
  };

  const handleLeaveGame = () => {
      // Simple leave - just navigate away. Backend might need cleanup (e.g., mark lobby abandoned).
      localStorage.removeItem('cricCards_lobbyId');
      localStorage.removeItem('cricCards_isHost'); // May not be relevant here but good practice
      navigate('/lobby');
  };
  
  // Get all cards for the game setup
  const allCardsRaw = useQuery(api.cards.getAll) || [];
  
  // Function to filter out cards with empty or zero stats
  const filterValidCards = (cards: any[]) => {
    return cards.filter(card => {
      // Check if the card has at least some non-zero stats
      const hasNonZeroStats = [
        card.Batting_Average,
        card.Batting_Strike_Rate,
        card.Runs_Scored,
        card.Wickets_Taken,
        card.Centuries,
        card.Half_Centuries,
        card.Sixes,
        card.Fours,
        card.Economy_Rate,
        card.Bowling_Average,
        card.Bowling_Strike_Rate
      ].some(stat => {
        // Convert to number if it's a string
        const numStat = typeof stat === 'string' ? parseFloat(stat) : stat;
        // Check if it's a valid number greater than 0
        return numStat !== undefined && numStat !== null && !isNaN(numStat) && numStat > 0;
      });
      
      return hasNonZeroStats;
    });
  };
  
  // Filter out cards with all zeros or empty stats
  const allCards = filterValidCards(allCardsRaw);
  
  // Create mutation for resetting a game
  const resetGame = useMutation(api.multiplayer.resetGame);

  const handlePlayAgain = async () => {
    if (!lobbyId || !allCards) return;
    
    // Check if current player is host (only host can reset game)
    const isHost = lobbyData?.hostPlayerName === playerName;
    if (!isHost) {
      alert("Only the host can restart the game.");
      return;
    }
    
    try {
      // Get all available cards for the new game - filter out cards with all zero/empty stats
      // We're using the filtered allCards which already excludes cards with all zero/empty stats
      const cardIds = allCards.map(card => card._id);
      
      console.log(`[Play Again] Using ${cardIds.length} valid cards out of ${allCardsRaw.length} total cards`);
      
      // Keep the same boosters data
      const orangeCapPlayer = lobbyData?.orangeCapPlayer || "Virat Kohli";
      const purpleCapPlayer = lobbyData?.purpleCapPlayer || "Jasprit Bumrah";
      const teamRankings = lobbyData?.teamRankings || {
        "Mumbai Indians": 1,
        "Chennai Super Kings": 2,
        "Royal Challengers Bangalore": 3,
        "Delhi Capitals": 4
      };
      
      // Reset the game with the same players in the same lobby
      await resetGame({
        lobbyId,
        playerName: playerName,
        orangeCapPlayer,
        purpleCapPlayer,
        teamRankings,
        availableCards: cardIds
      });
      
      console.log("Game reset successfully!");
    } catch (error) {
      console.error("Error restarting game:", error);
    }
  };


  // --- Game Over Logic ---
  // Memoize winner calculation
  const finalWinner = useMemo(() => {
      console.log('[Debug] Calculating finalWinner. gameOver:', gameOver);
      if (!gameOver || !lobbyData?.playerScores) return null;
      let winnerName: string | null = null;
      let maxScore = -Infinity;
      let tie = false;

      for (const player in playerScores) {
          const score = playerScores[player];
          if (score > maxScore) {
              maxScore = score;
              winnerName = player;
              tie = false;
          } else if (score === maxScore) {
              tie = true;
          }
      }
      const result = tie ? "Draw" : winnerName; // Return "Draw" or the winner's name
      console.log('[Debug] Final winner calculated:', result);
      return result;
  }, [gameOver, lobbyData?.playerScores]); // Depend on gameOver and the derived playerScores
 
 
  // --- UI Rendering ---


  // Handle case where user lands here without proper setup
  if (!lobbyId || !playerName) {
      return (
          <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white p-4">
              <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
              <h1 className="text-2xl font-bold mb-2">Error</h1>
              <p className="mb-4 text-center">Missing Player Name or Lobby ID. Returning Home</p>
              <button onClick={() => navigate('/lobby')} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white">
                  Redirecting...
              </button>
          </div>
      );
  }

  // Initial waiting overlay: show before gamePhase/currentPlayer ready
  return (
    <div className="relative min-h-screen flex flex-col bg-gradient-to-b from-indigo-900 to-indigo-950 text-white">
      {/* Top Bar: Player Scores & Status - Styled like single player */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-3 shadow-md flex items-center justify-between">
          <div className="flex items-center space-x-2">
              <button 
                  onClick={handleLeaveGame} 
                  className="flex items-center space-x-1 bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-sm font-medium transition-colors"
              >
                  <LogOut size={16} /> <span>Exit</span>
              </button>
              <div className="text-sm font-medium ml-2">
                  Playing as: <span className="text-yellow-300 font-bold">{playerName}</span>
                  <div className="text-xs text-gray-300">Session: {sessionId.substring(0, 7)}...</div>
              </div>
          </div>

          {/* Timer in center */}
          {(gamePhase === 'stat_selection' || gamePhase === 'card_selection') && isMyTurn && (
            <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center 
                                border-2 ${timeLeft <= 5 ? 'border-red-500' : 'border-blue-400'}`}>
                  <span className={`text-xl font-bold ${timeLeft <= 5 ? 'text-red-500' : 'text-white'}`}>
                    {timeLeft}
                  </span>
                </div>
              </motion.div>
            </div>
          )}

          <div className="flex items-center space-x-3">
              <div className="flex items-center">
                  <span className="text-sm mr-2">Current Player:</span>
                  <span className={`font-bold ${currentPlayer === playerName ? "text-yellow-300" : "text-white"}`}>
                      {currentPlayer || 'Waiting...'}
                  </span>
                  {currentPlayer === playerName && (
                    <span className="ml-1 text-green-400 text-xs">(Your Turn)</span>
                  )}
              </div>
              <div className="bg-blue-700 text-white text-lg font-bold w-8 h-8 rounded-full flex items-center justify-center">
                  {players.length}
              </div>
          </div>
      </div>
      
      {/* Game Board Content - Full Screen */}
      <div className="flex-grow relative">
           {/* Error Display */}
           {error && (
              <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 bg-red-800/80 rounded-lg text-center text-red-200 flex items-center justify-center gap-2 shadow-md"
              >
                  <AlertTriangle size={18} /> {error}
              </motion.div>
           )}

          {/* Main Game Area - All UI elements as overlays */}
          
          {/* Display Current Stat Overlay */}
          {gamePhase === 'card_selection' && selectedStat && (
              <div className="absolute top-20 right-8 z-30 bg-blue-900/70 backdrop-blur-sm rounded-lg p-3 shadow-lg">
                  <h3 className="text-lg font-bold text-yellow-300 mb-1">Playing Stat</h3>
                  <div className="text-white font-medium">{formatStatLabel(selectedStat)}</div>
              </div>
          )}

                 {/* Game Over Screen */}
                 {gameOver && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-0 flex items-center justify-center z-50"
                    >
                        <div className="bg-gradient-to-br from-green-800 to-emerald-900 backdrop-blur-sm p-8 rounded-lg text-center shadow-2xl border border-green-500 max-w-md">
                             <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4 animate-pulse" />
                             <h2 className="text-3xl font-bold mb-2 text-white">Game Over!</h2>
                             {finalWinner === "Draw" ? (
                                <p className="text-xl mb-4 text-gray-300">It's a draw!</p>
                             ) : finalWinner ? (
                                 <p className="text-xl mb-4 text-yellow-300">Winner: <span className="font-bold">{finalWinner}</span></p>
                             ) : (
                                  <p className="text-xl mb-4 text-gray-400">Calculating winner...</p>
                             )}
                              <h3 className="text-lg font-semibold mb-2 text-white">Final Scores:</h3>
                               <ul className="space-y-1 mb-6">
                                   {players.map(p => (
                                       <li key={p} className="flex justify-center gap-2 text-gray-200">
                                           <span>{p}:</span>
                                           <span className="font-bold">{playerScores[p] ?? 0}</span>
                                       </li>
                                   ))}
                          </ul>
                        <div className="flex justify-center space-x-4">
                            <button
                                onClick={handlePlayAgain}
                                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded text-white font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300"
                            >
                                Play Again
                            </button>
                            <button
                                onClick={handleLeaveGame}
                                className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 rounded text-black font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-300"
                            >
                                Return to Lobby
                            </button>
                        </div>
                        </div>
                    </motion.div>
                  )}

          {/* Full Screen Game Area */}
          <div className="flex-grow relative">
              {/* Waiting Indicator - As overlay */}
              {!isMyTurn && !gameOver && gamePhase && gamePhase !== 'waiting' && (
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-sm p-6 rounded-xl z-30 text-center">
                     <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3 text-blue-400" />
                     <p className="text-xl text-white font-medium">Waiting for {currentPlayer}'s move...</p>
                  </div>
              )}
              <div className="w-full h-[calc(100vh-64px)] relative"> {/* Fixed height calculation */}
                {handToRender.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-10">
                    <div className="bg-black/50 p-8 rounded-lg text-center max-w-md">
                      <h2 className="text-2xl font-bold text-white mb-4">{gamePhase === 'game_over' ? 'Game Over' : 'Waiting for Cards'}</h2>
                      <p className="text-gray-300">{gamePhase === 'game_over' ? 'The game has ended.' : 'Waiting for the game to start...'}</p>
                    </div>
                  </div>
                )}
                {/* Game Phase Indicator - Appears as overlay */}
                {gamePhase === 'stat_selection' && isMyTurn && (
                  <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-blue-600/80 backdrop-blur-sm px-6 py-3 rounded-lg z-30 text-center">
                    <h2 className="text-xl font-bold text-white mb-2">Select Stat to Play</h2>
                    <p className="text-sm text-blue-200">Click on a stat from your card to compete with</p>
                  </div>
                )}
                
                {/* Always render the 3D scene with the table, regardless of game state */}
                <Canvas 
                  camera={{ position: [0, 5, 10], fov: 50 }}
                  frameloop="demand" // Only render when needed
                  key="game-canvas" // Stable key to prevent recreation
                >
                  <ambientLight intensity={0.7} /> {/* Increased intensity */}
                  <pointLight position={[10, 10, 10]} intensity={1.0} />
                  <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
                  <Suspense fallback={null}>
                    <GameTable /> {/* Memoized table component */}
                    
                    {/* Always render the card hand component */}
                    {handToRender.length > 0 && (
                      <MemoizedCardHand
                        cards={handToRender}
                        onCardSelect={handleCardSelection}
                        onStatSelect={handleStatSelection}
                        isSelectable={isMyTurn && (gamePhase === 'card_selection' || gamePhase === 'stat_selection')}
                        gamePhase={gamePhase || ''}
                        currentPlayer={playerName || ''} 
                        selectedStat={lobbyData?.selectedStat} 
                        players={players}
                        playedCards={currentHandPlayedCards}
                        leadingCardInfo={leadingCardInfo}
                        playerHands={lobbyData?.playerHands || {}}
                      />
                    )}
                  </Suspense>
                </Canvas>
                
                {/* Floating Booster Buttons - Only show when player has cards and it's card selection phase */}
                {handToRender.length > 0 && (
                  <div className="absolute bottom-8 left-8 flex flex-col gap-4 z-20">
                    <BoosterButton
                      type="orange"
                      isActive={activeBooster === 'orange'}
                      isAvailable={isMyTurn && gamePhase === 'card_selection' && userBoosters.orange}
                      onClick={() => handleBoosterToggle('orange')}
                    />
                    <BoosterButton
                      type="purple"
                      isActive={activeBooster === 'purple'}
                      isAvailable={isMyTurn && gamePhase === 'card_selection' && userBoosters.purple}
                      onClick={() => handleBoosterToggle('purple')}
                    />
                    <BoosterButton
                      type="teamrank"
                      isActive={activeBooster === 'teamrank'}
                      isAvailable={isMyTurn && gamePhase === 'card_selection' && userBoosters.teamrank}
                      onClick={() => handleBoosterToggle('teamrank')}
                    />
                  </div>
                )}
                
                {/* Current Round Display - Exactly like single-player version */}
                {currentHandPlayedCards && currentHandPlayedCards.length > 0 && (
                  <div className="absolute top-20 left-0 right-0 mx-auto w-full max-w-5xl px-4 z-20">
                    <div className="bg-blue-900/40 backdrop-blur-md rounded-xl p-6">
                      <div className="grid grid-cols-4 gap-6">
                        {currentHandPlayedCards.map((card, index) => {
                          // Convert from MultiPlayer card format to SinglePlayer format
                          const singlePlayerCard = {
                            playerId: card.playerId,
                            card: {
                              Player_Name: card.cardName,
                              team: card.team || 'Unknown Team'
                              // Other card properties not needed for display
                            },
                            boosterUsed: card.boosterUsed,
                            finalValue: card.finalValue
                          };
                          
                          // Get team color for glow effect
                          const teamColor = getTeamColor(singlePlayerCard.card.team);
                          
                          return (
                            <motion.div
                              key={card.cardId}
                              whileHover={{ 
                                scale: 1.05,
                                y: -5,
                                zIndex: 30,
                                transition: { duration: 0.2 }
                              }}
                              animate={{
                                boxShadow: leadingCardInfo?.cardId === card.cardId 
                                  ? ['0 0 10px rgba(255, 215, 0, 0.4)', '0 0 20px rgba(255, 215, 0, 0.6)', '0 0 10px rgba(255, 215, 0, 0.4)'] 
                                  : ['0 0 0px rgba(0, 0, 0, 0)', '0 0 0px rgba(0, 0, 0, 0)'],
                                transition: {
                                  repeat: Infinity,
                                  repeatType: 'reverse',
                                  duration: 1.5
                                }
                              }}
                              className="relative rounded-xl overflow-hidden"
                              style={{ 
                                transformStyle: 'preserve-3d',
                                transformOrigin: 'center center'
                              }}
                            >
                              <PlayedCardDisplay
                                playedCard={singlePlayerCard}
                                selectedStat={gameState.selectedStat || 'Batting_Average'} 
                                isLeading={leadingCardInfo?.cardId === card.cardId}
                              />
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Overlay messages for waiting or game over states */}
                {handToRender.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-10">
                    <div className="bg-black/50 p-8 rounded-lg text-center max-w-md">
                      <h2 className="text-2xl font-bold text-white mb-4">{gamePhase === 'game_over' ? 'Game Over' : 'Waiting for Cards'}</h2>
                      <p className="text-gray-300">{gamePhase === 'game_over' ? 'The game has ended.' : 'Waiting for the game to start...'}</p>
                    </div>
                  </div>
                )}
                
                {/* Turn Indicator Overlay - Only for card selection phase */}
                {isMyTurn && gamePhase === 'card_selection' && (
                  <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-blue-600/80 backdrop-blur-sm px-6 py-3 rounded-lg z-30 text-center">
                    <h2 className="text-xl font-bold text-white mb-2">Select a Card to Play</h2>
                    <p className="text-sm text-blue-200">
                      Choose a card for: <span className="font-bold text-yellow-300">{formatStatLabel(lobbyData?.selectedStat || '')}</span>
                    </p>
                    
                  </div>
                )}
                
                {/* Winner Notification */}
                {leadingCardInfo && gamePhase === 'round_end' && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-yellow-600/80 backdrop-blur-sm 
                                    px-6 py-3 rounded-xl z-30 text-center border-2 border-yellow-400"
                  >
                    <h3 className="text-xl font-bold text-white mb-1">
                      {leadingCardInfo.playerId || 'Player'} wins the round!
                    </h3>
                    <p className="text-yellow-200">
                      With a {formatStatLabel(selectedStat || '')} value of {formatStatValue(
                        typeof leadingCardInfo.finalValue === 'number' ? leadingCardInfo.finalValue : 0, 
                        selectedStat || '')}
                    </p>
                  </motion.div>
                )}
              </div>
          </div>
      </div>
      {/* Absolute positioned navbar with winner circles matching single-player version */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-blue-900/90 backdrop-blur-md z-10 border-b border-blue-700">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-white">IPL Cricket Cards - Multiplayer</h1>
            <div className="flex items-center space-x-2 bg-blue-800/50 px-3 py-1 rounded-lg">
              <span className="text-sm text-gray-300">Round:</span>
              <span className="text-lg font-bold text-white">
                {lobbyData?.gamePhase !== 'game_over' ? (lobbyData?.completedHands?.length ?? 0) + 1 : (lobbyData?.completedHands?.length ?? 0)} / {lobbyData?.maxRounds ?? 0}
              </span>
            </div>
          </div>
          
          {/* Timer in center - exactly like single player */}
          {(gamePhase === 'stat_selection' || gamePhase === 'card_selection') && isMyTurn && (
            <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center 
                                border-2 ${timeLeft <= 5 ? 'border-red-500' : 'border-blue-400'}`}>
                  <span className={`text-xl font-bold ${timeLeft <= 5 ? 'text-red-500' : 'text-white'}`}>
                    {timeLeft}
                  </span>
                </div>
              </motion.div>
            </div>
          )}
          
          <div className="flex items-center gap-4">
            <span className="text-white mr-3">Current Player: {currentPlayer || 'Waiting...'}</span>
            <div className="flex items-center space-x-2">
              {/* Winner circles - EXACT match to single player implementation */}
              {[...Array(5)].map((_, i) => {
                // Get the completed hand for this round index, if it exists
                const completedHand = (lobbyData?.completedHands || [])[i];
                const roundWinner = completedHand?.winner?.playerId; // Get player ID of winner
                
                // Extract initials from winner name (just like single player)
                const nameParts = roundWinner?.split(' ') || [];
                // Just use the first character if only one name, or first letters of first+last name
                const initial = roundWinner 
                  ? nameParts.length > 1 
                    ? nameParts[0].charAt(0) + nameParts[1].charAt(0)
                    : nameParts[0]?.charAt(0)
                  : '';
                
                return (
                  <div 
                    key={i}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                      ${roundWinner 
                        ? 'bg-blue-800 border-2 border-yellow-400' 
                        : 'bg-blue-700/50 border border-blue-500'
                      }`}
                    title={roundWinner || `Round ${i+1} - Not Played`}
                  >
                    {roundWinner 
                      ? <span className="text-yellow-400">{initial}</span> 
                      : <span className="text-white opacity-70">👑</span>
                    }
                  </div>
                );
              })}
            </div>
            <button 
              onClick={handleLeaveGame} 
              className="flex items-center space-x-1 bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-sm font-medium transition-colors"
            >
              <LogOut size={16} /> <span>Exit</span>
            </button>
          </div>
        </div>
      </div>
      {/* Initial waiting overlay: show before gamePhase/currentPlayer ready */}
      {(!gamePhase || !currentPlayer) && gamePhase !== 'game_over' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm z-50">
          <Loader2 className="w-16 h-16 animate-spin text-white mb-4" />
          <p className="text-xl text-white">Waiting for game to start...</p>
        </div>
      )}
      
      {/* Debug console log */}
      {console.log("Debug Played Cards:", { 
        hasCards: currentHandPlayedCards && currentHandPlayedCards.length > 0, 
        selectedStat: gameState.selectedStat,
        numCards: currentHandPlayedCards?.length || 0
      })}
    </div>
  );
}
