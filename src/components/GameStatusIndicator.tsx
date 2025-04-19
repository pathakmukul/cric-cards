import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { useNavigate } from 'react-router-dom';

interface GameStatusIndicatorProps {
  currentPlayer: string;
  gamePhase: string;
  playerName: string;
  sessionId: string;
}

export default function GameStatusIndicator({ 
  currentPlayer, 
  gamePhase, 
  playerName, 
  sessionId 
}: GameStatusIndicatorProps) {
  const navigate = useNavigate();
  
  const formatGamePhase = (phase: string) => {
    switch(phase) {
      case 'waiting': return 'Waiting for players';
      case 'stat_selection': return 'Stat Selection';
      case 'card_selection': return 'Card Selection';
      case 'resolution': return 'Resolving Hand';
      case 'game_over': return 'Game Over';
      default: return phase.replace('_', ' ');
    }
  };
  
  const getStatusColor = (player: string, currentPlayer: string) => {
    return player === currentPlayer ? 'text-green-400' : 'text-white';
  };
  
  const isYourTurn = playerName === currentPlayer;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="absolute left-4 top-4 bg-gray-900/90 backdrop-blur-lg p-4 rounded-lg shadow-lg border border-indigo-900 w-64"
    >
      <div className="flex flex-col space-y-3">
        <div>
          <h3 className="text-xs uppercase text-gray-400 font-semibold">Playing as</h3>
          <p className="text-white font-semibold">{playerName}</p>
        </div>
        
        <div>
          <h3 className="text-xs uppercase text-gray-400 font-semibold">Session</h3>
          <p className="text-gray-300 text-sm font-mono truncate">{sessionId}</p>
        </div>
        
        <div>
          <h3 className="text-xs uppercase text-gray-400 font-semibold">Current Player</h3>
          <p className={`font-semibold ${getStatusColor(playerName, currentPlayer)}`}>
            {currentPlayer} {isYourTurn && '(You)'}
          </p>
        </div>
        
        <div>
          <h3 className="text-xs uppercase text-gray-400 font-semibold">Game Phase</h3>
          <p className="text-indigo-300 font-semibold">{formatGamePhase(gamePhase)}</p>
        </div>
        
        <button
          onClick={() => navigate('/')}
          className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-md"
        >
          Exit Game
        </button>
      </div>
    </motion.div>
  );
} 