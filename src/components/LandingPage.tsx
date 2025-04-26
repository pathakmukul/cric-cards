import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// import { Ticket as Cricket } from 'lucide-react';
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
    <div 
      className="min-h-screen flex items-center justify-center bg-cover bg-center relative"
      style={{ backgroundImage: "url('/stadium.jpg')" }}
    >
      <div className="text-center bg-black bg-opacity-60 p-10 rounded-lg shadow-2xl">
        <div className="flex justify-center mb-6">
          <img 
            src="/assets/cclogo.png" 
            alt="CricCards Logo" 
            className="w-60 h-60 object-contain"
          />
        </div>
        <h1 className="text-6xl font-bold text-white mb-4 font-sans">CricCards Battle</h1>
        <p className="text-xl text-gray-300 mb-8">Challenge your friends in the ultimate IndianT20 cricket card game!</p>
        <div className="flex flex-col md:flex-row gap-6 justify-center items-stretch md:items-stretch">
          <button
            onClick={handlePlaySinglePlayer}
            className="flex-1 px-8 py-6 bg-gradient-to-r from-yellow-500 to-orange-600 text-white font-bold rounded-lg text-lg 
                    transform transition hover:scale-105 hover:shadow-xl flex flex-col justify-center items-center min-h-[120px] min-w-[220px]
                    border border-yellow-300/30"
          >
            <span className="block text-2xl tracking-wide text-yellow-100">Play Solo</span>
            <span className="block text-base mt-1.5 font-normal">Battle with AI bots</span>
          </button>
          
          <button
            onClick={() => navigate('/pvp')}
            className="flex-1 px-8 py-6 bg-gradient-to-r from-red-500 to-red-700 text-white font-bold rounded-lg text-lg 
                    transform transition hover:scale-105 hover:shadow-xl flex flex-col justify-center items-center min-h-[120px] min-w-[220px]
                    border border-red-300/30"
          >
            <span className="block text-2xl tracking-wide text-red-100">PvP</span>
            <span className="block text-base mt-1.5 font-normal">Play online random</span>
          </button>


          <button
            onClick={handleMultiplayerClick}
            className="flex-1 px-8 py-6 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold rounded-lg text-lg 
                    transform transition hover:scale-105 hover:shadow-xl flex flex-col justify-center items-center min-h-[120px] min-w-[220px]
                    border border-purple-300/30"
          >
            <span className="block text-2xl tracking-wide text-purple-100">CreateLobby</span>
            <span className="block text-base mt-1.5 font-normal">Play with friends</span>
          </button>
          

          
          {/* Team Gallery button hidden for now
          <button
            className="flex-1 px-6 py-5 bg-gradient-to-r from-blue-400/50 to-indigo-500/50 text-white font-bold rounded-lg text-lg 
                    transform transition opacity-60 cursor-not-allowed flex flex-col justify-center items-center min-h-[100px]"
            disabled
          >
            <span className="block">Team Gallery</span>
            <span className="block text-xs mt-1 font-normal opacity-60">View team decorations</span>
          </button>
          */}
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
      
      {/* Terms and Conditions Link */}
      <div className="absolute bottom-4 right-4">
        <button 
          onClick={() => navigate('/terms')}
          className="text-white/70 text-xs hover:text-white hover:underline flex items-center"
        >
          <span className="mr-1">📄</span>
          Terms & Conditions
        </button>
      </div>
    </div>
  );
}