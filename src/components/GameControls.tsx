// GameControls component for handling game actions
import { useGameStore } from '../store/gameStore';
import { useState } from 'react';

export default function GameControls() {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { 
    currentPlayer, 
    players,
    playerBoosters,
    gamePhase,
    selectedCard,
    selectedStat,
    playCard,
    resolveHand,
    startNewHand,
    resetGame,
    playerScores
  } = useGameStore();

  const currentPlayerName = players[currentPlayer];
  const currentPlayerBoosters = playerBoosters[currentPlayerName] || { orange: false, purple: false, teamrank: false };

  const handlePlayCard = (boosterType?: 'orange' | 'purple' | 'teamrank') => {
    if (selectedCard && currentPlayerName) {
      playCard(currentPlayerName, selectedCard, boosterType);
    }
  };

  return (
    <>
      {/* Settings toggle button - always visible */}
      <div className="fixed bottom-4 right-4 z-20">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg flex items-center justify-center"
          title={isExpanded ? "Hide Controls" : "Show Controls"}
        >
          {/* Settings/Gear icon */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Game phase indicator - always visible */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-800/80 backdrop-blur-sm px-4 py-1 rounded-full z-20">
        <span className="text-white font-medium">
          {currentPlayerName}'s Turn | {gamePhase.replace('_', ' ').toUpperCase()}
        </span>
      </div>

      {/* Collapsible controls panel */}
      {isExpanded && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900/90 backdrop-blur-md p-4 border-t border-blue-800 z-10 animate-slideUp">
          <div className="flex flex-col gap-4">
            {/* Game Status */}
            <div className="flex justify-between items-center">
              <div className="text-white">
                <h2 className="text-xl font-bold">Current Turn: {currentPlayerName}</h2>
                <p className="text-sm">Game Phase: {gamePhase.replace('_', ' ').toUpperCase()}</p>
              </div>
              
              <div className="flex gap-2">
                {players.map(player => (
                  <div key={player} className={`px-3 py-1 rounded ${player === currentPlayerName ? 'bg-green-500' : 'bg-gray-700'}`}>
                    <span className="text-white font-medium">{player}: {playerScores[player] || 0}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Game Controls */}
            <div className="flex flex-wrap gap-3 justify-center">
              {/* Stat Selection Phase */}
              {gamePhase === 'stat_selection' && (
                <div className="text-center text-white">
                  <p>Select a card and then choose a stat to play with</p>
                </div>
              )}

              {/* Card Selection Phase */}
              {gamePhase === 'card_selection' && (
                <div className="w-full">
                  <div className="flex justify-center mb-2">
                    <p className="text-white">Playing with stat: <span className="font-bold">{selectedStat}</span></p>
                  </div>
                  
                  {selectedCard && (
                    <div className="flex flex-wrap gap-2 justify-center">
                      <button
                        onClick={() => handlePlayCard()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                      >
                        Play Card (No Booster)
                      </button>
                      
                      {/* Booster buttons */}
                      {Object.entries(currentPlayerBoosters).map(([type, available]) => (
                        <button
                          key={type}
                          onClick={() => handlePlayCard(type as 'orange' | 'purple' | 'teamrank')}
                          disabled={!available}
                          className={`px-4 py-2 rounded-md ${
                            available 
                              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                              : 'bg-gray-400 cursor-not-allowed'
                          }`}
                        >
                          Play with {type.charAt(0).toUpperCase() + type.slice(1)} Booster
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Resolution Phase */}
              {gamePhase === 'resolution' && (
                <button
                  onClick={resolveHand}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-md font-bold"
                >
                  Resolve Hand
                </button>
              )}

              {/* Game Over Phase */}
              {gamePhase === 'game_over' && (
                <div className="text-center w-full">
                  <h2 className="text-2xl font-bold text-white mb-4">
                    Game Over! Winner: {
                      Object.entries(playerScores).reduce((winner, [player, score]) => {
                        if (!winner || score > playerScores[winner]) return player;
                        return winner;
                      }, '')
                    }
                  </h2>
                  <button
                    onClick={resetGame}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-bold"
                  >
                    Play Again
                  </button>
                </div>
              )}

              {/* Start New Hand button (after resolution) */}
              {gamePhase === 'stat_selection' && (
                <button
                  onClick={startNewHand}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
                >
                  Start New Hand
                </button>
              )}
            </div>

            {/* Booster Legend */}
            <div className="mt-4 text-xs text-white/70 text-center">
              <p>Orange Cap: 1.2× boost for batting stats</p>
              <p>Purple Cap: 1.2× boost for bowling stats</p>
              <p>Team Rank: 1.1× to 1.4× boost based on team ranking</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}