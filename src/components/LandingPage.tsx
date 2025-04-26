import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// import { Ticket as Cricket } from 'lucide-react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXTwitter } from '@fortawesome/free-brands-svg-icons';

export default function LandingPage() {
  const navigate = useNavigate();
  const [showMultiplayerWarning, setShowMultiplayerWarning] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);

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
          

          <button
            onClick={() => setShowHowTo(true)}
            className="flex-1 px-8 py-6 bg-gradient-to-r from-blue-400 to-indigo-600 text-white font-bold rounded-lg text-lg transform transition hover:scale-105 hover:shadow-xl flex flex-col justify-center items-center min-h-[120px] min-w-[220px] border border-blue-300/30"
          >
            <span className="block text-2xl tracking-wide text-blue-100">How to Play</span>
            <span className="block text-base mt-1.5 font-normal">Learn the rules</span>
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
        
        {showHowTo && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto relative shadow-xl border border-indigo-500/30">
              <button onClick={() => setShowHowTo(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl font-bold">&times;</button>
              <h2 className="text-3xl font-bold mb-6 text-white bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">How to Play CricCards</h2>
              <div className="space-y-6 text-gray-300">
                <p className="text-lg">Welcome to <span className="font-bold text-yellow-400">CricCards Battle</span>! Compete with cricket player stats in this exciting card game.</p>
                
                <div className="bg-indigo-900/30 p-4 rounded-lg border border-indigo-800">
                  <h3 className="text-xl font-semibold mb-3 text-indigo-300">Game Modes</h3>
                  <ul className="space-y-2 ml-2">
                    <li className="flex items-start">
                      <span className="text-yellow-400 mr-2">•</span>
                      <div>
                        <span className="font-semibold text-yellow-300">Solo Play:</span> Battle against 3 AI bots in a quick match
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-red-400 mr-2">•</span>
                      <div>
                        <span className="font-semibold text-red-300">PvP Random:</span> Instantly join a match with other online players
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-400 mr-2">•</span>
                      <div>
                        <span className="font-semibold text-purple-300">Create Lobby:</span> Make a private lobby and invite friends using your lobby code
                      </div>
                    </li>
                  </ul>
                </div>
                
                <div className="bg-indigo-900/30 p-4 rounded-lg border border-indigo-800">
                  <h3 className="text-xl font-semibold mb-3 text-indigo-300">Game Rules</h3>
                  <ol className="space-y-3 ml-2">
                    <li className="flex items-start">
                      <span className="bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">1</span>
                      <div>Each player gets 5 cards with cricket player stats</div>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">2</span>
                      <div>The first player selects a stat (batting or bowling) to compete with</div>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">3</span>
                      <div>All players then choose one of their cards to play</div>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">4</span>
                      <div>The player with the best stat value for that round wins the hand</div>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">5</span>
                      <div>Winner gets 1 point and chooses the stat for the next round</div>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">6</span>
                      <div>After 5 rounds, the player with the most points wins the game</div>
                    </li>
                  </ol>
                </div>
                
                <div className="bg-indigo-900/30 p-4 rounded-lg border border-indigo-800">
                  <h3 className="text-xl font-semibold mb-3 text-indigo-300">Card Statistics</h3>
                  <p className="mb-3">Cards include batting and bowling stats. For most stats, <span className="text-green-400">higher is better</span>, but for Economy Rate and Bowling Average, <span className="text-amber-400">lower is better</span>.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-yellow-300 mb-2">Batting Stats</h4>
                      <ul className="space-y-1">
                        <li className="flex items-center">
                          <span className="text-yellow-400 mr-2">•</span>
                          <span>Runs Scored</span>
                        </li>
                        <li className="flex items-center">
                          <span className="text-yellow-400 mr-2">•</span>
                          <span>Batting Average</span>
                        </li>
                        <li className="flex items-center">
                          <span className="text-yellow-400 mr-2">•</span>
                          <span>Batting Strike Rate</span>
                        </li>
                        <li className="flex items-center">
                          <span className="text-yellow-400 mr-2">•</span>
                          <span>Centuries</span>
                        </li>
                        <li className="flex items-center">
                          <span className="text-yellow-400 mr-2">•</span>
                          <span>Half Centuries</span>
                        </li>
                        <li className="flex items-center">
                          <span className="text-yellow-400 mr-2">•</span>
                          <span>Fours & Sixes</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-purple-300 mb-2">Bowling Stats</h4>
                      <ul className="space-y-1">
                        <li className="flex items-center">
                          <span className="text-purple-400 mr-2">•</span>
                          <span>Wickets Taken</span>
                        </li>
                        <li className="flex items-center">
                          <span className="text-purple-400 mr-2">•</span>
                          <span>Bowling Average <span className="text-amber-400 text-xs">(lower is better)</span></span>
                        </li>
                        <li className="flex items-center">
                          <span className="text-purple-400 mr-2">•</span>
                          <span>Economy Rate <span className="text-amber-400 text-xs">(lower is better)</span></span>
                        </li>
                        <li className="flex items-center">
                          <span className="text-purple-400 mr-2">•</span>
                          <span>Bowling Strike Rate</span>
                        </li>
                        <li className="flex items-center">
                          <span className="text-purple-400 mr-2">•</span>
                          <span>4 & 5 Wicket Hauls</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="bg-indigo-900/30 p-4 rounded-lg border border-indigo-800">
                  <h3 className="text-xl font-semibold mb-3 text-indigo-300">Special Boosters</h3>
                  <p className="mb-3">Each player gets three one-time boosters to use during the game:</p>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <div className="w-8 h-8 bg-amber-500 rounded-full flex-shrink-0 flex items-center justify-center mr-3">
                        <span className="text-white font-bold">🔶</span>
                      </div>
                      <div>
                        <span className="font-semibold text-amber-300">Orange Cap:</span> Adds a 10% boost to your selected stat
                      </div>
                    </li>
                    <li className="flex items-start">
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex-shrink-0 flex items-center justify-center mr-3">
                        <span className="text-white font-bold">🔷</span>
                      </div>
                      <div>
                        <span className="font-semibold text-purple-300">Purple Cap:</span> Adds a 20% boost to your selected stat
                      </div>
                    </li>
                    <li className="flex items-start">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex-shrink-0 flex items-center justify-center mr-3">
                        <span className="text-white font-bold">🏆</span>
                      </div>
                      <div>
                        <span className="font-semibold text-green-300">Team Rank:</span> Adjusts stats based on the player's team ranking
                      </div>
                    </li>
                  </ul>
                  <p className="mt-4 text-amber-400 text-sm italic">Use boosters strategically to win important rounds!</p>
                </div>
                
                <div className="text-center">
                  <button
                    onClick={() => setShowHowTo(false)}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg font-semibold text-white hover:from-indigo-600 hover:to-purple-700 transform transition hover:scale-105"
                  >
                    Got it! Let's Play
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer Links */}
      <div className="absolute bottom-4 right-4 flex items-center space-x-4">
        {/* X (formerly Twitter) Contact Icon */}
        <a
          href="https://x.com/pathuglife"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/70 hover:text-white"
        >
          <FontAwesomeIcon icon={faXTwitter} size="lg" />
        </a>
        
        {/* Terms and Conditions Link */}
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