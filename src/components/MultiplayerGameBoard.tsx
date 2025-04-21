import React, { Suspense, useEffect, useState, useRef, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { useQuery, useMutation } from 'convex/react'; // Import Convex hooks
import { api } from '../../convex/_generated/api'; // Import Convex API
import { Id, Doc } from '../../convex/_generated/dataModel'; // Import Convex types
import MultiplayerCardHand from './MultiplayerCardHand';
import { motion } from 'framer-motion';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Loader2, AlertTriangle, LogOut, Trophy } from 'lucide-react'; // Added icons

// Import BoosterButton from GameBoard
import { BoosterButton } from './GameBoard';

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

// --- Components (PlayedCardDisplay, BoosterButton - Keep as they are UI related) ---
const PlayedCardDisplay = ({
  playedCard,
  selectedStat,
  isLeading = false
}: {
  playedCard: { // Matches structure in lobbyData.currentHand.playedCards
    playerId: string;
    cardId: Id<"iplstats">;
    cardName: string; // Use cardName directly
    boosterUsed?: BoosterType | null;
    rawValue: number;
    finalValue: number;
  };
  selectedStat: string; // Should always be defined when this component is rendered
  isLeading?: boolean;
}) => {
  const getBoosterIcon = (booster?: BoosterType | null) => {
    switch (booster) {
      case 'orange': return { icon: '🏏', color: '#f97316' };
      case 'purple': return { icon: '🎯', color: '#a855f7' };
      case 'teamrank': return { icon: '👑', color: '#0ea5e9' };
      default: return null;
    }
  };

  const booster = getBoosterIcon(playedCard.boosterUsed);
  // Card team data isn't directly here, use defaults or simplify
  const teamColor = '#1e40af'; // Default color
  const formattedStatLabel = formatStatLabel(selectedStat);
  const formattedStatValue = formatStatValue(playedCard.finalValue, selectedStat);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-xl p-0.5 ${isLeading ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' : 'bg-gray-700'}`}
    >
      <div
        className={`backdrop-blur-lg rounded-lg p-3`}
        style={{ background: `rgba(17, 24, 39, 0.8)` }} // Use a consistent dark background
      >
        {/* Player Info */}
        <div className="flex items-center justify-between mb-2">
          <div className={`text-sm font-bold ${isLeading ? 'text-yellow-300' : 'text-white'} truncate`}>{playedCard.playerId}</div>
          {booster && (
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0"
              style={{ backgroundColor: booster.color }}
              title={`${playedCard.boosterUsed} booster`}
            >
              {booster.icon}
            </div>
          )}
        </div>

        {/* Card Info */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="text-white text-xs font-light truncate">{playedCard.cardName}</div>
          </div>
          {/* Stat Value */}
          <div className="flex items-center justify-between mt-1 bg-black/30 rounded px-2 py-1">
            <span className="text-gray-400 text-xs">{formattedStatLabel}:</span>
            <span className={`font-bold text-base ${isLeading ? 'text-yellow-400' : 'text-white'}`}>
              {formattedStatValue}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

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

export default function MultiplayerGameBoard() {
  const navigate = useNavigate();
  // Get URL parameters and localStorage values
  const { lobbyId: lobbyIdParam } = useParams();
  const location = useLocation();
  const playerNameFromUrl = new URLSearchParams(location.search).get('player');
  const lobbyIdFromStorage = typeof window !== 'undefined' ? localStorage.getItem('cricCards_lobbyId') : '';
  const playerNameFromStorage = typeof window !== 'undefined' ? localStorage.getItem('cricCards_playerName') : '';
  // Use param, then storage, then fallback
  const lobbyId = lobbyIdParam || lobbyIdFromStorage || '';
  const [playerName, setPlayerName] = useState<string>(playerNameFromUrl || playerNameFromStorage || '');

  // Redirect to lobby if missing info
  useEffect(() => {
    if (!lobbyId || !playerName) {
      setTimeout(() => {
        navigate('/lobby');
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
      userCardIds.length > 0 ? { cardIds: userCardIds } : "skip" // Skip query if no card IDs
  );

  // --- Derived State from Lobby Data ---
  const gamePhase = lobbyData?.gamePhase;
  const currentPlayer = lobbyData?.currentPlayer;
  const players = lobbyData?.players ?? [];
  const playerScores = (lobbyData?.playerScores as PlayerScoresMap) ?? {};
  const playerBoosters = (lobbyData?.playerBoosters as PlayerBoostersMap) ?? {};
  const playerHands = (lobbyData?.playerHands as PlayerHandsMap) ?? {};
  const userBoosters = playerBoosters[playerName] || { orange: false, purple: false, teamrank: false };
  const isMyTurn = currentPlayer === playerName;
  const currentHandPlayedCards = lobbyData?.currentHand?.playedCards || [];
  const gameOver = gamePhase === 'game_over';
  const leadingCardInfo = lobbyData?.currentHand?.leadingCard; // Can be object or undefined

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

  // Defensive check: show loading if gamePhase or currentPlayer is not ready
  if ((!gamePhase || !currentPlayer) && gamePhase !== 'game_over') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-indigo-900 to-indigo-950 text-white">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <div className="text-lg">Waiting for game to start...</div>
        <div className="text-sm text-gray-400 mt-2">If this takes too long, try refreshing or rejoining the lobby.</div>
      </div>
    );
  }

  // --- Loading and Error States ---
  const isLoadingLobby = lobbyData === undefined && !!lobbyId; // Only loading if lobbyId exists but data hasn't arrived
  // Loading hand if we expect cards but haven't received data yet
  const isLoadingHand = userCardIds.length > 0 && userHandCardsData === undefined;

  // No need to explicitly type the imported component as it's already imported

  // Function to handle stat selection directly from card
  const handleCardStatSelection = (statKey: string) => {
    if (gamePhase === 'stat_selection' && isMyTurn) {
      handleStatSelection(statKey);
    }
  };

  // --- Action Handlers ---
  const handleStatSelection = async (stat: string) => {
    // Extra validation
    if (!isMyTurn || gamePhase !== 'stat_selection' || !lobbyId || !playerName) {
        console.warn("Stat selection attempt failed validation:", { isMyTurn, gamePhase, lobbyId, playerName });
        return;
    }
    setError(null);
    try {
      console.log(`[UI] Selecting Stat: ${stat}`);
      
      // Show what we're sending to the server
      const moveData = {
        lobbyId,
        playerName,
        action: "select_stat",
        selectedStat: stat,
      };
      console.log('Making move with data:', moveData);
      
      await makeMove(moveData);
      console.log(`Stat selection complete: ${stat}`);
      // State updates are handled by useQuery re-fetching lobbyData
    } catch (err: any) {
      console.error("Failed to select stat:", err);
      setError(`Error selecting stat: ${err.message || err}`);
    }
  };

  const handleCardSelection = async (cardId: Id<"iplstats">) => {
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
      const moveData = {
        lobbyId,
        playerName,
        action: "play_card",
        selectedCardId: cardId,
        useBooster: activeBooster ?? undefined, // Convert null to undefined
      };
      console.log('Making move with data:', moveData);
      
      await makeMove(moveData);
      console.log(`Card play complete: ${cardId}`);
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
 
 
  // --- UI Rendering ---\

  // Handle case where user lands here without proper setup
  if (!lobbyId || !playerName) {
      return (
          <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white p-4">
              <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
              <h1 className="text-2xl font-bold mb-2">Error</h1>
              <p className="mb-4 text-center">Missing Player Name or Lobby ID. Please return to the lobby.</p>
              <button onClick={() => navigate('/lobby')} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white">
                  Go to Lobby
              </button>
          </div>
      );
  }

  // Loading state while lobby data is fetched
  if (isLoadingLobby) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <Loader2 className="w-12 h-12 animate-spin mr-2" /> Loading Game Data...
      </div>
    );
  }

  // Handle case where lobby data failed to load (e.g., lobby deleted)
  if (!lobbyData) {
    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white p-4">
              <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
              <h1 className="text-2xl font-bold mb-2">Error</h1>
              <p className="mb-4 text-center">Could not load lobby data for Lobby ID: {lobbyId}. It might have been deleted or an error occurred.</p>
              <button onClick={handleLeaveGame} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white">
                  Return to Lobby
              </button>
          </div>
    );
  }

  // Define the key stats that can be selected during the game

  // Start timer when player changes or game phase changes to stat/card selection
  useEffect(() => {
    // Don't start timer if we're not in an active selection phase
    if ((gamePhase === 'stat_selection' || gamePhase === 'card_selection') && isMyTurn) {
      // Reset timer
      setTimeLeft(15);
      
      // Clear any existing timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      // Start new timer
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Time's up - auto select if needed
            clearInterval(timerRef.current!);
            timerRef.current = null;
            // Auto-selection logic would go here
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // If not in selection phase or not my turn, pause the timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    
    // Clean up on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gamePhase, currentPlayer, isMyTurn]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-indigo-900 to-indigo-950 text-white">
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
      <div className="relative flex-grow">

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
                        <button
                            onClick={handleLeaveGame}
                            className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 rounded text-black font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-300"
                        >
                            Return to Lobby
                        </button>
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
              {isLoadingHand ? (
                  <div className="h-full flex items-center justify-center text-gray-400">
                      <Loader2 className="w-8 h-8 animate-spin mr-3" /> 
                      <span className="text-lg">Loading Game...</span>
                  </div>
              ) : userHandCardsData && userHandCardsData.length > 0 ? (
                  <div className="w-full h-[calc(100vh-64px)] relative"> {/* Fixed height calculation */}
                      {/* Game Phase Indicator - Appears as overlay */}
                      {gamePhase === 'stat_selection' && isMyTurn && (
                          <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-blue-600/80 backdrop-blur-sm px-6 py-3 rounded-lg z-30 text-center">
                              <h2 className="text-xl font-bold text-white mb-2">Select Stat to Play</h2>
                              <p className="text-sm text-blue-200">Click on a stat from your card to compete with</p>
                          </div>
                      )}
                      
                      <Canvas camera={{ position: [0, 5, 10], fov: 50 }}>
                          <ambientLight intensity={0.7} /> {/* Increased intensity */}
                          <pointLight position={[10, 10, 10]} intensity={1.0} />
                          <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
                          <Suspense fallback={null}>
                              <MultiplayerCardHand
                                  cards={userHandCardsData as PlayerCardData[]}
                                  onCardSelect={handleCardSelection}
                                  onStatSelect={handleCardStatSelection}
                                  isSelectable={isMyTurn && (gamePhase === 'card_selection' || gamePhase === 'stat_selection')}
                                  gamePhase={gamePhase || ''}
                                  currentPlayer={playerName || ''} 
                                  selectedStat={selectedStat || ''}
                                  players={players}
                                  playedCards={currentHandPlayedCards.map(played => ({
                                      playerId: played.playerId,
                                      card: played.card,
                                      isLeading: leadingCardInfo?.playerId === played.playerId
                                  }))}
                              />
                          </Suspense>
                      </Canvas>
                      
                      {/* Floating Booster Buttons */}
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
                      
                      {/* Turn Indicator Overlay - Only for card selection phase */}
                      {isMyTurn && gamePhase === 'card_selection' && (
                          <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-blue-600/80 backdrop-blur-sm px-6 py-3 rounded-lg z-30 text-center">
                              <h2 className="text-xl font-bold text-white mb-2">Select a Card to Play</h2>
                              <p className="text-sm text-blue-200">Choose a card to compete with {selectedStat}</p>
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
              ) : (
                  <div className="h-full flex items-center justify-center">
                      <div className="bg-black/30 backdrop-blur-sm p-8 rounded-lg text-center max-w-md">
                          <h2 className="text-2xl font-bold text-white mb-4">{gamePhase === 'game_over' ? 'Game Over' : 'Waiting for Cards'}</h2>
                          <p className="text-gray-300">{gamePhase === 'game_over' ? 'The game has ended.' : 'Waiting for the game to start...'}</p>
                      </div>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
}
