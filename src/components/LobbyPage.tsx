import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Ticket as Cricket, LogIn, PlusCircle, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import DiagnosticPanel from './DiagnosticPanel';
import { Doc, Id } from '../../convex/_generated/dataModel';

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

export default function LobbyPage({ isPvP = false }: { isPvP?: boolean }) {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');
  const [activeLobbyId, setActiveLobbyId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState<string | null>(null);
  const [lobbyCodeToJoin, setLobbyCodeToJoin] = useState('');
  
  // Track API initialization status
  const [apiError, setApiError] = useState(false);
  const [isLoadingLobbyData, setIsLoadingLobbyData] = useState(false);
  const [hasAutoStarted, setHasAutoStarted] = useState(false);
  
  // Use proper hook pattern for Convex
  let createLobbyMut = null;
  let joinLobbyMut = null;
  let startGameMut = null;
  let findOrJoinPvPLobbyMut = null;
  
  // Get all cards for the game setup
  const allCardsRaw = useQuery(api.cards.getAll);
  
  // Function to filter out cards with empty or zero stats
  const filterValidCards = (cards: any[]) => {
    if (!cards) return [];
    
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
  const allCardsData = filterValidCards(allCardsRaw);
  const boostersData = useQuery(api.cards.getBoosters);
  const teamRankingsData = useQuery(api.cards.getTeamRankings);
  
  // Extract necessary game data once loaded
  const orangeCapPlayer = boostersData?.[0]?.Orange_Cap || undefined;
  const purpleCapPlayer = boostersData?.[0]?.Purple_Cap || undefined;
  const teamRankings = teamRankingsData?.reduce((acc, rankData) => {
    acc[rankData.team_ranking] = rankData.RANK;
    return acc;
  }, {} as Record<string, number>) || {};
  
  try {
    createLobbyMut = useMutation(api.multiplayer.createLobby);
    joinLobbyMut = useMutation(api.multiplayer.joinLobby);
    startGameMut = useMutation(api.multiplayer.startGame);
    if (isPvP) findOrJoinPvPLobbyMut = useMutation(api.multiplayer.findOrJoinPvPLobby);
  } catch (err) {
    console.error("Convex API hooks failed:", err);
  }
  
  // Removed the myLobbies query as we no longer show rejoin options
  
  const activeLobbyData = useQuery(
    api.multiplayer.getLobbyData, 
    activeLobbyId ? { lobbyId: activeLobbyId } : "skip"
  );
  
  useEffect(() => {
    if (activeLobbyId) {
      if (activeLobbyData === undefined) {
        setIsLoadingLobbyData(true);
      } else if (activeLobbyData === null) {
        console.warn(`Active lobby ${activeLobbyId} not found. Clearing.`);
        setError('The selected lobby could not be found or is no longer active.');
        setActiveLobbyId(null);
        localStorage.removeItem('cricCards_lobbyId');
        localStorage.removeItem('cricCards_isHost');
        setIsLoadingLobbyData(false);
      } else {
        setIsLoadingLobbyData(false);
      }
    }
  }, [activeLobbyId, activeLobbyData]);
  
  useEffect(() => {
    const storedPlayerName = localStorage.getItem('cricCards_playerName');
    if (storedPlayerName) {
      setPlayerName(storedPlayerName);
    }
  }, []);

  useEffect(() => {
    if (activeLobbyData && activeLobbyData.gameStarted) {
      // Include both player name and lobbyId in URL parameters
      const gameUrl = `/multiplayer?player=${encodeURIComponent(playerName)}&lobbyId=${encodeURIComponent(activeLobbyId || '')}`;
      console.log(`Game started (lobby ${activeLobbyId}), navigating ${playerName} to ${gameUrl}`);
      navigate(gameUrl);
    }
  }, [activeLobbyData, navigate, activeLobbyId, playerName]);

  useEffect(() => {
    console.log("PvP auto-start debug:", {
      isPvP,
      isHost: playerName === activeLobbyData?.hostPlayerName,
      playersCount: activeLobbyData?.players?.length,
      hasAutoStarted,
      gameStarted: activeLobbyData?.gameStarted,
      hasMutation: !!startGameMut,
      hasLobbyId: !!activeLobbyId,
      hasCards: allCardsData?.length,
      orangeCapPlayer,
      purpleCapPlayer,
      teamRankingsLoaded: teamRankings && Object.keys(teamRankings).length
    });
    if (
      isPvP &&
      playerName === activeLobbyData?.hostPlayerName &&
      activeLobbyData?.players?.length === 4 &&
      !hasAutoStarted &&
      !activeLobbyData?.gameStarted &&
      startGameMut &&
      activeLobbyId &&
      allCardsData &&
      orangeCapPlayer &&
      purpleCapPlayer &&
      teamRankings
    ) {
      console.log("PvP lobby full, auto-starting game...");
      
      const startGameArgs = {
        lobbyId: activeLobbyId,
        playerName: activeLobbyData.hostPlayerName, // Use host's name from lobby data
        orangeCapPlayer,
        purpleCapPlayer,
        teamRankings,
        availableCards: allCardsData.map((card: any) => card._id)
      };
      
      startGameMut(startGameArgs)
        .catch(err => console.error("Failed to start PvP game:", err));
      setHasAutoStarted(true);
    }
  }, [isPvP, activeLobbyData, startGameMut, activeLobbyId, playerName, allCardsData, orangeCapPlayer, purpleCapPlayer, teamRankings, hasAutoStarted]);

  const handleCreateLobby = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    if (!createLobbyMut) {
      setError('Create lobby function not ready. Please wait or refresh.');
      console.error("createLobbyMut is null");
      return;
    }
    
    try {
      setError('');
      setIsCreating(true);
      
      const result = await createLobbyMut({
        playerName: playerName, 
      });
      
      const lobbyId = result.lobbyId;
      
      // Store in localStorage
      localStorage.setItem('cricCards_playerName', playerName);
      localStorage.setItem('cricCards_lobbyId', lobbyId);
      localStorage.setItem('cricCards_isHost', 'true');
      
      // Add player name to URL for better testing in multiple tabs
      const gameUrl = `/multiplayer?player=${encodeURIComponent(playerName)}`;
      
      setActiveLobbyId(lobbyId);
    } catch (err: any) {
      setError(`Failed to create lobby: ${err.message || err}`);
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };
  
  const handleJoinLobby = async (lobbyToJoinId?: string) => {
    const code = lobbyToJoinId || lobbyCodeToJoin.trim().toUpperCase();
    
    if (!playerName.trim()) {
      setError('Please enter your name first');
      return;
    }
    
    if (!code) {
      setError('Please enter a lobby code or select one from the list');
      return;
    }
    
    if (!joinLobbyMut) {
      setError('Join lobby function not ready. Please wait or refresh.');
      console.error("joinLobbyMut is null");
      return;
    }
    
    try {
      setError('');
      setIsJoining(code);
      
      await joinLobbyMut({ 
        lobbyId: code, 
        playerName 
      });
      
      // Store in localStorage
      localStorage.setItem('cricCards_playerName', playerName);
      localStorage.setItem('cricCards_lobbyId', code);
      localStorage.setItem('cricCards_isHost', 'false');
      
      // Add player name to URL for better testing in multiple tabs
      const gameUrl = `/multiplayer?player=${encodeURIComponent(playerName)}`;
      
      setActiveLobbyId(code);
      setLobbyCodeToJoin('');
      
      // Navigate with the player parameter
      if (activeLobbyData?.gameStarted) {
        navigate(gameUrl);
      }
    } catch (err: any) {
      setError(`Failed to join lobby ${code}: ${err.message || err}`);
      console.error(err);
    } finally {
      setIsJoining(null);
    }
  };
  
  const handleStartGame = async () => {
    if (!activeLobbyId || !playerName) return;
    
    if (!startGameMut) {
      setError('Start game function not ready. Please wait or refresh.');
      console.error("startGameMut is null");
      return;
    }
    
    // Ensure card/booster data is loaded
    if (!allCardsData || !boostersData || !teamRankingsData) {
      setError('Game data (cards, boosters, rankings) not loaded yet. Please wait.');
      return;
    }
    
    try {
      setIsLoadingLobbyData(true); 
      
      // Prepare arguments for startGame mutation
      const startGameArgs = {
        lobbyId: activeLobbyId,
        playerName: playerName, 
        orangeCapPlayer: orangeCapPlayer, // Use extracted value
        purpleCapPlayer: purpleCapPlayer, // Use extracted value
        teamRankings: teamRankings, // Use extracted value
        // Filter out cards with all zeros or empty stats and map to IDs
        availableCards: allCardsData.map((card: any) => card._id) // We're already using filtered cards
      };
      
      await startGameMut(startGameArgs);
      
      console.log("Start game mutation successful, waiting for navigation effect...");
      
    } catch (err: any) {
      setError(`Failed to start game: ${err.message || err}`);
      console.error(err);
      setIsLoadingLobbyData(false); 
    }
  };
  
  const handleLeaveLobby = () => {
    localStorage.removeItem('cricCards_lobbyId');
    localStorage.removeItem('cricCards_isHost');
    setActiveLobbyId(null);
    setError('');
    navigate('/');
  };
  
  const handleFindMatch = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    setError('');
    if (!findOrJoinPvPLobbyMut) return;
    try {
      const res = await findOrJoinPvPLobbyMut({ playerName });
      setActiveLobbyId(res.lobbyId);
    } catch (err: any) {
      setError(err.message || String(err));
    }
  };

  if (apiError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900/80 backdrop-blur-lg rounded-xl p-8 w-full max-w-md shadow-2xl"
        >
          <div className="flex justify-center mb-6">
            <Cricket className="w-16 h-16 text-white" />
          </div>
          
          <h1 className="text-3xl font-bold text-white text-center mb-4">API Initializing</h1>
          <p className="text-white text-center mb-6">
            Please wait a moment while the server initializes the new multiplayer API...
          </p>
          
          <button
            onClick={() => navigate('/')}
            className="w-full px-4 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600"
          >
            Back to Home
          </button>
        </motion.div>
      </div>
    );
  }
  
  if (isLoadingLobbyData) {
     return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 border-t-4 border-white border-solid rounded-full animate-spin mb-4 mx-auto"></div>
          <p className="text-white text-xl">Loading Lobby...</p>
        </div>
      </div>
    );
  }
  
  if (activeLobbyId && activeLobbyData) {
    // ONLY the first player in the array is the host - this is the definitive check
    const isFirstPlayer = activeLobbyData?.players?.[0] === playerName;
    const isHost = isFirstPlayer; // Only use this check, ignore localStorage
    
    // Update localStorage to match the server state
    if (isFirstPlayer) {
      localStorage.setItem('cricCards_isHost', 'true');
    } else {
      localStorage.setItem('cricCards_isHost', 'false');
    }
    
    const canStart = activeLobbyData?.players?.length >= 2;
    
    // Debug logging
    console.log('Lobby render state:', {
      isFirstPlayer,
      isHost,
      canStart,
      playersCount: activeLobbyData?.players?.length,
      playerName,
      allPlayers: activeLobbyData?.players
    });
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900/80 backdrop-blur-lg rounded-xl p-8 w-full max-w-md shadow-2xl relative"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Game Lobby</h2>
            <div className="px-3 py-1 bg-indigo-600 rounded-lg">
              <span className="text-white text-sm font-mono">{activeLobbyId}</span>
            </div>
          </div>
          
          <div className="bg-black/30 p-4 rounded-lg mb-6">
            <h3 className="text-white font-semibold mb-2">Players ({activeLobbyData?.players?.length ?? 0}/4)</h3>
            <ul className="space-y-2">
              {activeLobbyData?.players?.map((player: string, index: number) => (
                <li key={index} className="flex items-center">
                  <span className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white text-sm mr-2">
                    {index + 1}
                  </span>
                  <span className="text-white">
                    {player} {player === playerName && " (You)"} {index === 0 && " (Host)"}
                  </span>
                </li>
              ))}
              
              {Array.from({ length: 4 - (activeLobbyData?.players?.length ?? 0) }).map((_, index) => (
                <li key={`empty-${index}`} className="flex items-center text-gray-500">
                  <span className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center text-sm mr-2">
                    {(activeLobbyData?.players?.length ?? 0) + index + 1}
                  </span>
                  <span>Waiting for player...</span>
                </li>
              ))}
            </ul>
          </div>
          
          {error && (
            <p className="mb-4 text-red-400 text-center">{error}</p>
          )}
          
          <div className="flex flex-col gap-3">
            {isHost && !isPvP && (
              <button
                onClick={handleStartGame}
                disabled={!canStart || isLoadingLobbyData}
                className={`w-full px-4 py-3 rounded-lg font-semibold flex items-center justify-center transition-colors duration-150
                  ${canStart 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700' 
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'}
                  ${isLoadingLobbyData ? 'opacity-50 cursor-wait' : ''}  
                `}
              >
                {isLoadingLobbyData ? 'Starting...' : 'Start Game'}
              </button>
            )}
            
            <button
              onClick={handleLeaveLobby}
              className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg flex items-center justify-center"
            >
              Leave Lobby
            </button>
          </div>
          
          {isHost && !isPvP && !canStart && (
            <p className="text-yellow-400 text-sm mt-2 text-center">
              Need at least 2 players to start the game
            </p>
          )}
          
          {!isPvP && !isHost && (
            <p className="text-gray-400 text-sm mt-4 text-center">
              Waiting for host to start the game...
            </p>
          )}
        </motion.div>
        
        <DiagnosticPanel 
          apiState={{
            cardsAvailable: true, 
            boostersAvailable: true, 
            teamRankingsAvailable: true, 
            lobbyApiAvailable: !apiError
          }}
          multiplayer={{
            isActive: !!activeLobbyId,
            playerName: playerName,
            lobbyId: activeLobbyId || '',
            lobbyDataAvailable: !!activeLobbyData
          }}
        />
      </div>
    );
  }
  
  if (!activeLobbyId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900/80 backdrop-blur-lg rounded-xl p-8 w-full max-w-lg shadow-2xl"
        >
          <div className="flex justify-center mb-6">
            <Cricket className="w-16 h-16 text-white" />
          </div>
          
          <h1 className="text-3xl font-bold text-white text-center mb-6">{isPvP ? "PvP Matchmaking" : "Multiplayer Lobby"}</h1>
          
          <div className="mb-6">
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => {
                setPlayerName(e.target.value);
                localStorage.setItem('cricCards_playerName', e.target.value);
              }}
              className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter your name to see lobbies"
            />
          </div>

          {error && (
            <p className="mb-4 text-red-400 text-center bg-red-900/50 p-2 rounded">{error}</p>
          )}

          {!isPvP && (
          <div className="mb-6">
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Join by Code
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={lobbyCodeToJoin}
                onChange={(e) => setLobbyCodeToJoin(e.target.value.toUpperCase())}
                className="flex-grow px-4 py-2 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                placeholder="ENTER CODE"
                maxLength={6}
                disabled={!!isJoining || isCreating}
              />
              <button 
                onClick={() => handleJoinLobby()}
                disabled={!lobbyCodeToJoin || !!isJoining || isCreating}
                className={`px-4 py-2 rounded text-sm font-semibold flex items-center transition-colors duration-150 whitespace-nowrap ${!lobbyCodeToJoin || !!isJoining || isCreating
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'}
                  `}
              >
                {isJoining === lobbyCodeToJoin ? 'Joining...' : <><LogIn className="w-4 h-4 mr-1"/> Join</>}
              </button>
            </div>
          </div>
          )}
          
          {/* Re-Join Your Lobbies section removed as it's no longer needed */}

          <div className="flex flex-col gap-3">
            {!isPvP && (
            <button
              onClick={handleCreateLobby}
              disabled={!playerName || !!isJoining || isCreating}
              className={`w-full px-4 py-3 rounded-lg font-semibold flex items-center justify-center transition-colors duration-150 ${!playerName || !!isJoining || isCreating
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:from-yellow-500 hover:to-orange-600'}
              `}
            >
              {isCreating ? 'Creating...' : <><PlusCircle className="w-5 h-5 mr-2"/> Create New Lobby</>}
            </button>
            )}
            
            {isPvP && (
              <button
                onClick={handleFindMatch}
                disabled={!playerName.trim()}
                className={`w-full px-4 py-3 rounded-lg font-semibold flex items-center justify-center transition-colors duration-150 ${!playerName.trim() ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-red-400 to-red-600 text-white hover:from-red-500 hover:to-red-700'}`}
              >
                Find Match
              </button>
            )}
            
            <button
              onClick={() => navigate('/')}
              className="w-full px-4 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 flex items-center justify-center"
            >
              <LogOut className="w-5 h-5 mr-2"/> Back to Menu
            </button>
          </div>
          
        </motion.div>

        <DiagnosticPanel 
          apiState={{
            cardsAvailable: true,
            boostersAvailable: true, 
            teamRankingsAvailable: true,
            lobbyApiAvailable: !apiError
          }}
          multiplayer={{
            isActive: false,
            playerName: playerName,
            lobbyId: '',
            lobbyDataAvailable: false
          }}
        />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 to-black flex items-center justify-center px-4">
       <p className="text-white text-xl">Error: Unable to determine lobby state.</p>
    </div>
  );
} 