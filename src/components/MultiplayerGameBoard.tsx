import React, { Suspense, useEffect, useState, useRef, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { useQuery, useMutation } from 'convex/react'; // Import Convex hooks
import { api } from '../../convex/_generated/api'; // Import Convex API
import { Id, Doc } from '../../convex/_generated/dataModel'; // Import Convex types
import MultiplayerCardHand from './MultiplayerCardHand';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertTriangle, LogOut, Trophy } from 'lucide-react'; // Added icons

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

interface BoosterButtonProps {
  type: BoosterType;
  isActive: boolean;
  isAvailable: boolean;
  onClick: () => void;
}

const BoosterButton = ({ type, isActive, isAvailable, onClick }: BoosterButtonProps) => {
    const getBoosterColors = () => {
        switch (type) {
            case 'orange': return { bg: isActive ? 'bg-orange-500' : 'bg-orange-700', ring: 'ring-orange-300', hover: 'hover:bg-orange-600', disabled: 'bg-orange-900' };
            case 'purple': return { bg: isActive ? 'bg-purple-500' : 'bg-purple-700', ring: 'ring-purple-300', hover: 'hover:bg-purple-600', disabled: 'bg-purple-900' };
            case 'teamrank': return { bg: isActive ? 'bg-blue-500' : 'bg-blue-700', ring: 'ring-blue-300', hover: 'hover:bg-blue-600', disabled: 'bg-blue-900' };
            default: return { bg: 'bg-gray-700', ring: 'ring-gray-300', hover: 'hover:bg-gray-600', disabled: 'bg-gray-900' }; // Fallback
        }
    };
  const colors = getBoosterColors();
  const icons = { orange: '🏏', purple: '🎯', teamrank: '👑' };

  return (
    <motion.button
      whileHover={{ scale: isAvailable ? 1.1 : 1 }}
      whileTap={{ scale: isAvailable ? 0.95 : 1 }}
      className={`w-12 h-12 rounded-full ${isAvailable ? `${colors.bg} ${colors.hover}` : colors.disabled} flex items-center justify-center text-white text-xl ${isActive ? `ring-4 ${colors.ring}` : ''} transition-colors duration-200 ${!isAvailable && 'opacity-50 cursor-not-allowed'}`}
      onClick={isAvailable ? onClick : undefined}
      disabled={!isAvailable}
      title={`${type} booster ${isAvailable ? '(Available)' : '(Used)'}`}
    >
      {icons[type]}
    </motion.button>
  );
};


// --- Main Multiplayer Game Board Component ---

// Explicitly define the props interface for MultiplayerCardHand (must match the one inside the component file)
interface MultiplayerCardHandProps {
  cards: PlayerCardData[];
  onCardSelect: (cardId: Id<"iplstats">) => void;
  isSelectable: boolean;
}

export default function MultiplayerGameBoard() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [activeBooster, setActiveBooster] = useState<BoosterType | null>(null); // Local UI state for booster selection

  // --- Get Player and Lobby Info ---
  const lobbyId = useMemo(() => localStorage.getItem('cricCards_lobbyId'), []);
  const playerName = useMemo(() => localStorage.getItem('cricCards_playerName'), []);

  useEffect(() => {
    if (!lobbyId || !playerName) {
      console.error("Missing lobbyId or playerName in localStorage. Redirecting.");
      navigate('/lobby'); // Redirect if essential info is missing
    }
  }, [lobbyId, playerName, navigate]);

  // --- Convex Hooks ---
  const lobbyData = useQuery(api.multiplayer.getLobbyData, lobbyId ? { lobbyId } : "skip");
  const makeMove = useMutation(api.multiplayer.makeMove);
  // checkBotMoves is triggered by the backend scheduler via makeMove, no need to call from frontend

  // Get current player's hand IDs from lobbyData
  const userCardIds = useMemo(() => {
    if (lobbyData && playerName && lobbyData.playerHands) {
      // Ensure playerHands is treated as the correct map type
      const handsMap = lobbyData.playerHands as PlayerHandsMap;
      return handsMap[playerName] || [];
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
  const selectedStat = lobbyData?.selectedStat; // Stat chosen for the hand
  const players = lobbyData?.players ?? [];
  const playerScores = (lobbyData?.playerScores as PlayerScoresMap) ?? {};
  const playerBoosters = (lobbyData?.playerBoosters as PlayerBoostersMap) ?? {};
  const currentHandPlayedCards = lobbyData?.currentHand?.playedCards ?? [];
  const leadingCardInfo = lobbyData?.currentHand?.leadingCard; // Can be object or undefined
  const isMyTurn = currentPlayer === playerName;
  const userBoosters = playerBoosters[playerName ?? ''] ?? { orange: false, purple: false, teamrank: false };
  const gameOver = gamePhase === 'game_over';
  const gameStatus = lobbyData?.status; // "waiting", "in_progress", "completed"

  // --- Loading and Error States ---
  const isLoadingLobby = lobbyData === undefined && !!lobbyId; // Only loading if lobbyId exists but data hasn't arrived
  // Loading hand if we expect cards but haven't received data yet
  const isLoadingHand = userCardIds.length > 0 && userHandCardsData === undefined;

  // Explicitly type the imported component
  const HandComponent: React.FC<MultiplayerCardHandProps> = MultiplayerCardHand;

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
      await makeMove({
        lobbyId,
        playerName,
        action: "select_stat",
        selectedStat: stat,
      });
      // State updates are handled by useQuery re-fetching lobbyData
    } catch (err: any) {
      console.error("Failed to select stat:", err);
      setError(`Error selecting stat: ${err.message || err}`);
    }
  };

  const handleCardSelection = async (cardId: Id<"iplstats">) => {
    // Extra validation
     if (!isMyTurn || gamePhase !== 'card_selection' || !lobbyId || !playerName || !selectedStat) {
        console.warn("Card selection attempt failed validation:", { isMyTurn, gamePhase, lobbyId, playerName, selectedStat });
        return;
     }
    setError(null);
    try {
      console.log(`[UI] Playing Card: ${cardId} with Booster: ${activeBooster}`);
      await makeMove({
        lobbyId,
        playerName,
        action: "play_card",
        selectedCardId: cardId,
        useBooster: activeBooster ?? undefined, // Convert null to undefined
      });
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


  // --- Game Over Logic ---\
  // Memoize winner calculation
  const finalWinner = useMemo(() => {
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
      return tie ? "Draw" : winnerName; // Return "Draw" or the winner's name
  }, [gameOver, lobbyData?.playerScores]);


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

  // Available stats for selection (assuming fixed list)
   const availableStats = [
    "Runs_Scored", "Batting_Average", "Batting_Strike_Rate", "Centuries", "Half_Centuries", "Sixes", "Fours",
    "Wickets_Taken", "Economy_Rate", "Bowling_Average", "Bowling_Strike_Rate", "Four_Wicket_Hauls", "Five_Wicket_Hauls"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 text-white flex flex-col p-4 overflow-hidden">
      {/* Background Canvas - Optional */}
      <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
        <Canvas>
          <Suspense fallback={null}>
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          </Suspense>
        </Canvas>
      </div>

      {/* Game Board Content */}
      <div className="relative z-10 flex flex-col flex-grow">

          {/* Top Bar: Player Scores & Status */}
          <div className="flex justify-between items-center mb-4 bg-black/30 backdrop-blur-sm p-3 rounded-lg shadow-lg">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {players.map(p => (
                      <div key={p} className={`border-b-2 ${currentPlayer === p ? 'border-yellow-400' : 'border-transparent'} px-2 py-1 transition-colors duration-300`}>
                          <span className={`font-semibold text-sm ${currentPlayer === p ? 'text-yellow-300' : 'text-gray-300'}`}>
                              {p}{p === playerName ? ' (You)' : ''}
                          </span>: <span className="text-white font-bold text-sm">{playerScores[p] ?? 0}</span>
                      </div>
                  ))}
              </div>
              <div className="flex items-center space-x-3 flex-shrink-0">
                 <span className="text-sm text-gray-400 italic hidden sm:inline">
                     {gameStatus === 'completed' ? 'Game Over' : `Phase: ${formatStatLabel(gamePhase ?? 'Unknown')}`}
                 </span>
                 <button onClick={handleLeaveGame} className="text-red-500 hover:text-red-400 transition-colors" title="Leave Game">
                      <LogOut size={20} />
                  </button>
              </div>
          </div>

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

          {/* Main Game Area */}
          <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-4 items-start">

              {/* Left Panel: Opponent Hands (Simplified) */}
              <div className="md:col-span-1 space-y-3">
                 <h2 className="text-lg font-semibold mb-2 text-gray-400">Opponents</h2>
                 {players.filter(p => p !== playerName).map(opponentName => {
                     // Get hand size from lobbyData.playerHands
                     const handSize = (lobbyData.playerHands as PlayerHandsMap)?.[opponentName]?.length ?? 0;
                     return (
                        <div key={opponentName} className="bg-black/20 p-3 rounded-lg backdrop-blur-sm shadow">
                            <p className="text-white mb-1 font-medium text-sm truncate">{opponentName}</p>
                            <div className="flex flex-wrap gap-1">
                                {Array.from({ length: handSize }).map((_, i) => (
                                    <div key={i} className="w-6 h-10 bg-gradient-to-br from-indigo-600 to-purple-700 rounded border border-indigo-400 shadow-sm"></div>
                                ))}
                                {handSize === 0 && <p className="text-xs text-gray-500 italic w-full">No cards</p>}
                            </div>
                         </div>
                     );
                 })}
              </div>

              {/* Center Panel: Played Cards / Stat Selection / Game Over */}
              <div className="md:col-span-1 flex flex-col items-center">
                  {/* Display Played Cards */}
                  {gamePhase === 'card_selection' && selectedStat && (
                      <motion.div
                         initial={{ opacity: 0 }}
                         animate={{ opacity: 1 }}
                         className="w-full mb-4"
                      >
                         <h2 className="text-xl font-bold text-center mb-3 text-yellow-400">Playing Stat: {formatStatLabel(selectedStat)}</h2>
                         <div className="grid grid-cols-2 gap-3">
                             {currentHandPlayedCards.map(played => (
                                <PlayedCardDisplay
                                    key={played.playerId} // Use playerId as key assumes one card per player per hand
                                    playedCard={played}
                                    selectedStat={selectedStat}
                                    isLeading={leadingCardInfo?.playerId === played.playerId}
                                />
                             ))}
                         </div>
                      </motion.div>
                  )}

                  {/* Display Stat Selection Buttons */}
                  {isMyTurn && gamePhase === 'stat_selection' && (
                      <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="w-full bg-black/30 backdrop-blur-sm p-4 rounded-lg shadow-lg"
                      >
                          <h2 className="text-xl font-bold text-center mb-4 text-yellow-400">Select Stat to Play</h2>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {availableStats.map(stat => (
                                  <motion.button
                                      key={stat}
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => handleStatSelection(stat)}
                                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-white text-xs sm:text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                  >
                                      {formatStatLabel(stat)}
                                  </motion.button>
                              ))}
                          </div>
                      </motion.div>
                  )}

                 {/* Game Over Screen */}
                 {gameOver && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full bg-gradient-to-br from-green-800 to-emerald-900 backdrop-blur-sm p-6 rounded-lg text-center shadow-2xl border border-green-500"
                    >
                        <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4 animate-pulse" />
                        <h2 className="text-3xl font-bold mb-2 text-white">Game Over!</h2>
                        {finalWinner === "Draw" ? (
                           <p className="text-xl mb-4 text-gray-300">It's a draw!</p>
                        ) : finalWinner ? (
                            <p className="text-xl mb-4 text-yellow-300">Winner: <span className="font-bold">{finalWinner}</span></p>
                        ) : (
                             <p className="text-xl mb-4 text-gray-400">Calculating winner...</p> // Should not happen if gamePhase is game_over
                        )}
                         <h3 className="text-lg font-semibold mb-2 text-white">Final Scores:</h3>
                          <ul className="space-y-1 mb-6">
                              {players.map(p => (
                                  <li key={p} className="flex justify-center gap-2 text-gray-200">
                                      <span>{p}:</span>
                                      <span className="font-bold">{playerScores[p] ?? 0}</span>
                                  </li>
                              ))}\
                          </ul>
                        <button
                            onClick={handleLeaveGame}
                            className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 rounded text-black font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-300"
                        >
                            Return to Lobby
                        </button>
                    </motion.div>
                  )}

                 {/* Waiting Indicator */}\
                 {!isMyTurn && !gameOver && gameStatus === 'in_progress' && (
                     <div className="mt-8 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
                        <p className="text-gray-400 italic">Waiting for {currentPlayer}...</p>
                     </div>
                 )}

              </div>

              {/* Right Panel: Boosters */}
               <div className="md:col-span-1 flex flex-col items-center space-y-4">
                  <h2 className="text-lg font-semibold text-gray-400 mb-2">Boosters</h2>
                  <BoosterButton
                      type="orange"
                      isActive={activeBooster === 'orange'}
                      // Can only USE booster if it's your turn, card_selection phase, and you have it available
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
          </div>

          {/* Bottom Area: Player Hand */}
          <div className="mt-4 pt-4 border-t border-gray-700/50 flex flex-col items-center">
             <h2 className="text-lg font-semibold mb-3 text-gray-300">Your Hand</h2>
              {isLoadingHand ? (
                   <div className="flex items-center justify-center text-gray-400 h-32"> {/* Give hand area some height */}
                       <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading Hand...
                   </div>
               ) : userHandCardsData && userHandCardsData.length > 0 ? (
                  // Use the explicitly typed HandComponent
                  <HandComponent
                      cards={userHandCardsData as PlayerCardData[]}
                      onCardSelect={handleCardSelection}
                      isSelectable={isMyTurn && gamePhase === 'card_selection'}
                  />
              ) : (
                 <p className="text-gray-500 italic h-32 flex items-center justify-center">{(gamePhase === 'game_over') ? 'Game ended.' : 'No cards in hand.'}</p>
              )}
          </div>
      </div>
    </div>
  );
}
