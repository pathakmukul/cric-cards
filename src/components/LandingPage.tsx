import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket as Cricket } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LandingPage() {
  const navigate = useNavigate();
  const [showMultiplayerWarning, setShowMultiplayerWarning] = useState(false);

  const handlePlaySinglePlayer = () => {
    // Clear any multiplayer data to ensure single player works
    localStorage.removeItem('cricCards_playerName');
    localStorage.removeItem('cricCards_lobbyId');
    localStorage.removeItem('cricCards_isHost');
    
    // Go to game directly
    navigate('/game');
  };

  const handleMultiplayerClick = () => {
    // Show a warning for now while we fix multiplayer
    // setShowMultiplayerWarning(true);
    
    // Uncomment this when multiplayer is working
    navigate('/lobby');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
      <div className="text-center">
        <div className="flex justify-center mb-8">
          <Cricket className="w-20 h-20 text-white" />
        </div>
        <h1 className="text-6xl font-bold text-white mb-4">IPL Card Battle</h1>
        <p className="text-xl text-gray-300 mb-8">Challenge your friends in the ultimate IPL card game!</p>
        <div className="flex flex-col md:flex-row gap-4 justify-center">
          <button
            onClick={handlePlaySinglePlayer}
            className="px-8 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold rounded-lg text-xl 
                    transform transition hover:scale-105 hover:shadow-xl"
          >
            Single Player
          </button>
          <button
            onClick={handleMultiplayerClick}
            className="px-8 py-4 bg-gradient-to-r from-purple-400 to-pink-500 text-white font-bold rounded-lg text-xl 
                    transform transition hover:scale-105 hover:shadow-xl"
          >
            Multiplayer
          </button>
          <button
            onClick={() => navigate('/pvp')}
            className="px-8 py-4 bg-gradient-to-r from-red-400 to-red-600 text-white font-bold rounded-lg text-xl 
                    transform transition hover:scale-105 hover:shadow-xl"
          >
            PvP
          </button>
          <button
            onClick={() => navigate('/team-decorations')}
            className="px-8 py-4 bg-gradient-to-r from-blue-400 to-indigo-500 text-white font-bold rounded-lg text-xl 
                    transform transition hover:scale-105 hover:shadow-xl"
          >
            View Team Designs
          </button>
        </div>
        
        {showMultiplayerWarning && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-red-500/20 border border-red-400 rounded-lg p-4 text-red-100 max-w-md mx-auto"
          >
            <p className="font-medium">
              Multiplayer mode is currently under maintenance. Please use Single Player mode for now.
            </p>
            <button 
              onClick={() => setShowMultiplayerWarning(false)}
              className="mt-2 px-3 py-1 bg-red-700 hover:bg-red-800 rounded-md text-sm"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}