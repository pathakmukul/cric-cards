import React, { Suspense, useEffect, useState, useRef, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useGameStore } from '../store/gameStore';
import CardHand from './CardHand';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export interface BoosterButtonProps {
  type: 'orange' | 'purple' | 'teamrank';
  isActive: boolean;
  isAvailable: boolean;
  onClick: () => void;
}

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

// Helper function to format stat labels
const formatStatLabel = (statKey: string): string => {
  const statLabels: Record<string, string> = {
    'Wickets_Taken': 'Wickets',
    'Runs_Scored': 'Runs',
    'Batting_Average': 'Batting Avg',
    'Batting_Strike_Rate': 'Strike Rate',
    'Bowling_Average': 'Bowling Avg',
    'Bowling_Strike_Rate': 'Bowl SR',
    'Economy_Rate': 'Economy',
    'Centuries': 'Centuries',
    'Half_Centuries': 'Half Centuries',
    'Sixes': 'Sixes',
    'Fours': 'Fours',
    'Highest_Score': 'Highest Score',
    'Four_Wicket_Hauls': 'Four Wickets',
    'Five_Wicket_Hauls': 'Five Wickets'
  };
  
  return statLabels[statKey] || statKey.replace(/_/g, ' ');
};

// Helper function to format stat values
const formatStatValue = (value: number, statKey: string): string => {
  // Integer stats should not have decimal places
  const integerStats = [
    'Wickets_Taken', 'Runs_Scored', 'Centuries', 'Half_Centuries',
    'Sixes', 'Fours', 'Four_Wicket_Hauls', 'Five_Wicket_Hauls'
  ];
  
  if (integerStats.includes(statKey)) {
    return Math.round(value).toString();
  }
  
  // For decimal stats, show 2 decimal places
  return value.toFixed(2);
};

const PlayedCardDisplay = ({ 
  playedCard, 
  selectedStat,
  isLeading = false
}: { 
  playedCard: {
    playerId: string;
    card: any;
    boosterUsed?: 'orange' | 'purple' | 'teamrank' | null;
    finalValue?: number;
  };
  selectedStat: string;
  isLeading?: boolean;
}) => {
  const getBoosterIcon = (booster?: 'orange' | 'purple' | 'teamrank' | null) => {
    switch (booster) {
      case 'orange': return { icon: '🏏', color: '#f97316' };
      case 'purple': return { icon: '🎯', color: '#a855f7' };
      case 'teamrank': return { icon: '👑', color: '#0ea5e9' };
      default: return null;
    }
  };

  const booster = getBoosterIcon(playedCard.boosterUsed);
  const teamColor = getTeamColor(playedCard.card.team);
  const formattedStatLabel = formatStatLabel(selectedStat);
  const formattedStatValue = playedCard.finalValue !== undefined 
    ? formatStatValue(playedCard.finalValue, selectedStat) 
    : '0';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden ${isLeading ? 'ring-2 ring-yellow-400' : ''}`}
    >
      <div 
        className={`backdrop-blur-lg rounded-xl p-4 ${isLeading ? 'shadow-lg shadow-yellow-400/30' : ''}`}
        style={{
          background: `linear-gradient(135deg, ${teamColor}40, ${teamColor}20)`,
          border: `2px solid ${isLeading ? '#FFD700' : teamColor}`,
          boxShadow: `0 0 20px ${isLeading ? '#FFD70060' : `${teamColor}40`}`
        }}
      >
        {/* Player Info */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-bold text-white">{playedCard.playerId}</div>
          {booster && (
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
              style={{ backgroundColor: booster.color }}
              title={`${playedCard.boosterUsed} booster`}
            >
              {booster.icon}
            </div>
          )}
        </div>

        {/* Card Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: teamColor }}
            />
            <div className="text-white font-medium">{playedCard.card.Player_Name}</div>
          </div>
          
          {/* Team Name */}
          <div className="text-sm text-gray-300">{playedCard.card.team || 'Unknown Team'}</div>
          
          {/* Stat Value */}
          <div className="flex items-center justify-between mt-2 bg-black/30 rounded-lg p-2">
            <span className="text-gray-300">{formattedStatLabel}:</span>
            <span className="font-bold text-lg text-yellow-400">
              {formattedStatValue}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export const BoosterButton = ({ type, isActive, isAvailable, onClick }: BoosterButtonProps) => {
  const getBoosterColors = () => {
    switch (type) {
      case 'orange':
        return {
          bg: isActive ? 'bg-orange-500' : 'bg-orange-700',
          ring: 'ring-orange-300',
          hover: 'hover:bg-orange-600',
          disabled: 'bg-orange-900'
        };
      case 'purple':
        return {
          bg: isActive ? 'bg-purple-500' : 'bg-purple-700',
          ring: 'ring-purple-300',
          hover: 'hover:bg-purple-600',
          disabled: 'bg-purple-900'
        };
      case 'teamrank':
        return {
          bg: isActive ? 'bg-blue-500' : 'bg-blue-700',
          ring: 'ring-blue-300',
          hover: 'hover:bg-blue-600',
          disabled: 'bg-blue-900'
        };
    }
  };

  const colors = getBoosterColors();
  
  return (
    <motion.button
      whileHover={{ scale: isAvailable ? 1.1 : 1 }}
      whileTap={{ scale: isAvailable ? 0.95 : 1 }}
      className={`
        w-14 h-14 rounded-full ${isAvailable ? `${colors.bg} ${colors.hover}` : colors.disabled}
        flex items-center justify-center text-white font-bold
        ${isActive ? `ring-4 ${colors.ring}` : ''}
        transition-colors duration-200
        ${!isAvailable && 'opacity-50 cursor-not-allowed'}
      `}
      onClick={isAvailable ? onClick : undefined}
      disabled={!isAvailable}
    >
      {type === 'orange' && '🏏'}
      {type === 'purple' && '🎯'}
      {type === 'teamrank' && '👑'}
    </motion.button>
  );
};

export default function GameBoard() {
  const { 
    dealCards, 
    setGameData,
    gamePhase,
    currentPlayer,
    players,
    selectedStat,
    currentHand,
    playerBoosters,
    activeBooster,
    setActiveBooster,
    lastWinner,
    resolveHand,
    startNewHand,
    playerScores,
    resetGame,
    completedHands,
    playerHands,
    selectStat,
    selectCard,
    playCardWithStat
  } = useGameStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState(15);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const allCards = useQuery(api.cards.getAll);
  const boosters = useQuery(api.cards.getBoosters) as any[] | undefined;
  const teamRankings = useQuery(api.cards.getTeamRankings) as any[] | undefined;

  useEffect(() => {
    if (allCards && boosters && teamRankings) {
      setIsLoading(false);
      
      const formattedCards = allCards.map((card) => ({
        id: card._id,
        Player_Name: card.Player_Name,
        team: card.team || 'Unknown Team',
        stats: {
          Runs_Scored: card.Runs_Scored || 0,
          Batting_Average: card.Batting_Average || 0,
          Batting_Strike_Rate: card.Batting_Strike_Rate || 0,
          Centuries: card.Centuries || 0,
          Half_Centuries: card.Half_Centuries || 0,
          Sixes: card.Sixes || 0,
          Fours: card.Fours || 0,
          Highest_Score: card.Highest_Score || '0',
          Wickets_Taken: card.Wickets_Taken || 0,
          Economy_Rate: card.Economy_Rate || 0,
          Bowling_Average: card.Bowling_Average || 0,
          Bowling_Strike_Rate: card.Bowling_Strike_Rate || 0,
          Four_Wicket_Hauls: card.Four_Wicket_Hauls || 0,
          Five_Wicket_Hauls: card.Five_Wicket_Hauls || 0,
        }
      }));
      
      const shuffledCards = [...formattedCards].sort(() => Math.random() - 0.5);
      dealCards(shuffledCards);
      
      if (boosters.length > 0 && teamRankings.length > 0) {
        const orangeCap = boosters.find(b => b.Orange_Cap)?.Orange_Cap || '';
        const purpleCap = boosters.find(b => b.Purple_Cap)?.Purple_Cap || '';
        
        const teamRankingsMap = teamRankings.reduce((map: Record<string, number>, team) => {
          if (team.team_ranking && team.RANK) {
            map[team.team_ranking] = team.RANK;
          }
          return map;
        }, {});
        
        setGameData(orangeCap, purpleCap, teamRankingsMap);
      }
    }
  }, [allCards, boosters, teamRankings, dealCards, setGameData]);

  // Auto-resolve when all players have played
  useEffect(() => {
    if (gamePhase === 'resolution' && currentHand) {
      const allPlayersPlayed = players.every(player =>
        currentHand.playedCards.some(pc => pc.playerId === player)
      );

      if (allPlayersPlayed) {
        resolveHand();
        // Show the winner for 2 seconds before starting the new hand
        setTimeout(() => {
          startNewHand();
        }, 2000);
      }
    }
  }, [gamePhase, currentHand, players, resolveHand, startNewHand]);

  const currentPlayerName = players[currentPlayer];
  const currentPlayerBoosters = playerBoosters[currentPlayerName] || { orange: false, purple: false, teamrank: false };

  // Find the winner when game is over
  const getWinner = () => {
    if (gamePhase !== 'game_over') return null;
    const winner = Object.entries(playerScores).reduce((a, b) => 
      (b[1] > a[1] ? b : a), ['', 0]
    );
    return {
      name: winner[0],
      score: winner[1]
    };
  };

  const winner = getWinner();

  // Start timer when player changes or game phase changes to stat/card selection
  useEffect(() => {
    // Don't start timer if we're showing the round winner notification
    if ((gamePhase === 'stat_selection' || gamePhase === 'card_selection') && !lastWinner) {
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
            // Time's up - make a random move ONLY if not showing winner notification
            if (!lastWinner) {
              makeRandomMove();
            }
            return 15; // Reset timer for next player
          }
          return prev - 1;
        });
      }, 1000);
    } else if (lastWinner) {
      // If showing winner notification, pause the timer by clearing the interval
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentPlayer, gamePhase, lastWinner]);
  
  // Clear timer when component unmounts
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  
  // Function to make a random move when time runs out
  const makeRandomMove = () => {
    const currentPlayerName = players[currentPlayer];
    const playerCards = playerHands[currentPlayerName] || [];
    
    if (playerCards.length === 0) return;
    
    // Pick a random card from the player's hand
    const randomCard = playerCards[Math.floor(Math.random() * playerCards.length)];
    
    // If we're in stat selection phase, we need to select a stat first
    if (gamePhase === 'stat_selection') {
      const statKeys = ['Batting_Average', 'Batting_Strike_Rate', 'Runs_Scored', 'Centuries', 
                        'Wickets_Taken', 'Economy_Rate', 'Bowling_Average', 'Sixes'];
      const randomStat = statKeys[Math.floor(Math.random() * statKeys.length)];
      
      // Play the card with the random stat
      playCardWithStat(currentPlayerName, randomCard, randomStat);
    } 
    // If we're in card selection phase, a stat is already selected
    else if (gamePhase === 'card_selection' && currentHand) {
      // Play the random card with the already selected stat
      playCardWithStat(currentPlayerName, randomCard, currentHand.selectedStat);
    }
  };

  return (
    <div className="w-screen h-screen bg-gradient-to-b from-blue-900 to-black overflow-hidden">
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-white text-2xl font-bold">
            Loading IPL Cricket Cards...
            <div className="mt-4 w-12 h-12 border-t-4 border-blue-500 border-solid rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      ) : (
        <>
          <div className="absolute top-0 left-0 right-0 p-4 bg-blue-900/90 backdrop-blur-md z-10 border-b border-blue-700">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-white">IPL Cricket Cards Game</h1>
              
              {/* Timer in center */}
              {(gamePhase === 'stat_selection' || gamePhase === 'card_selection') && !lastWinner && (
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
                <span className="text-white mr-3">Current Player: {currentPlayerName}</span>
                <div className="flex items-center space-x-2">
                  {[...Array(5)].map((_, i) => {
                    const roundWinner = completedHands[i]?.winner;
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
              </div>
            </div>
          </div>

          {/* Booster buttons */}
          <div className="absolute bottom-8 left-8 flex flex-col gap-4 z-20">
            <BoosterButton
              type="orange"
              isActive={activeBooster === 'orange'}
              isAvailable={currentPlayerBoosters.orange}
              onClick={() => setActiveBooster(activeBooster === 'orange' ? null : 'orange')}
            />
            <BoosterButton
              type="purple"
              isActive={activeBooster === 'purple'}
              isAvailable={currentPlayerBoosters.purple}
              onClick={() => setActiveBooster(activeBooster === 'purple' ? null : 'purple')}
            />
            <BoosterButton
              type="teamrank"
              isActive={activeBooster === 'teamrank'}
              isAvailable={currentPlayerBoosters.teamrank}
              onClick={() => setActiveBooster(activeBooster === 'teamrank' ? null : 'teamrank')}
            />
          </div>

          {/* Current Round Display */}
          {currentHand && (
            <div className="absolute top-20 left-0 right-0 mx-auto w-full max-w-5xl px-4">
              <div className="bg-blue-900/40 backdrop-blur-md rounded-xl p-6">
                <div className="grid grid-cols-4 gap-6">
                  {currentHand.playedCards.map((playedCard, index) => (
                    <PlayedCardDisplay
                      key={index}
                      playedCard={playedCard}
                      selectedStat={currentHand.selectedStat}
                      isLeading={playedCard.playerId === currentHand.leadingCard?.playerId}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {lastWinner && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-yellow-600/80 backdrop-blur-sm 
                         px-6 py-3 rounded-xl z-30 text-center border-2 border-yellow-400"
            >
              <h3 className="text-xl font-bold text-white mb-1">
                {lastWinner.playerId} wins the round!
              </h3>
              <p className="text-yellow-200">
                With a {formatStatLabel(lastWinner.stat)} value of {formatStatValue(lastWinner.value, lastWinner.stat)}
              </p>
            </motion.div>
          )}

          <div className="pt-16 h-full">
            <Canvas camera={{ position: [0, 5, 10], fov: 50 }}>
              <Suspense fallback={null}>
                <ambientLight intensity={0.7} />
                <pointLight position={[10, 10, 10]} intensity={1.0} />
                <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
                <CardHand />
              </Suspense>
            </Canvas>
          </div>

          {gamePhase === 'waiting' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
              <div className="bg-white/10 backdrop-blur-md p-8 rounded-lg text-center">
                <h2 className="text-3xl font-bold text-white mb-4">Welcome to IPL Cricket Cards</h2>
                <p className="text-white mb-6">Each player gets 5 cards. Select a stat to play with and compete against other players!</p>
                <button 
                  onClick={() => startNewHand()}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold transition-colors"
                >
                  Start Game
                </button>
              </div>
            </div>
          )}

          {/* Game Over Screen */}
          {gamePhase === 'game_over' && winner && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 flex items-center justify-center bg-black/90 z-50"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-gradient-to-b from-blue-900 to-blue-800 p-12 rounded-2xl text-center max-w-2xl mx-4"
              >
                <h2 className="text-5xl font-bold text-white mb-6">Game Over!</h2>
                <div className="space-y-4 mb-8">
                  <h3 className="text-3xl font-bold text-yellow-400">
                    {winner.name} Wins!
                  </h3>
                  <p className="text-xl text-blue-200">
                    With {winner.score} rounds won
                  </p>
                </div>

                {/* Final Scores */}
                <div className="bg-black/30 rounded-xl p-6 mb-8">
                  <h4 className="text-xl font-semibold text-white mb-4">Final Scores</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(playerScores).map(([player, score]) => (
                      <div 
                        key={player}
                        className={`p-3 rounded-lg ${
                          player === winner.name 
                            ? 'bg-yellow-500/20 border-2 border-yellow-500'
                            : 'bg-white/10'
                        }`}
                      >
                        <div className="text-lg font-medium text-white">{player}</div>
                        <div className="text-2xl font-bold text-yellow-400">{score}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    resetGame();
                    navigate('/');
                  }}
                  className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold 
                           text-xl transition-all transform hover:scale-105 hover:shadow-lg"
                >
                  Play Again
                </button>
              </motion.div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}