import { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useGameStore } from '../store/gameStore';
import CardHand from './CardHand';
import GameControls from './GameControls';

interface BoosterData {
  _id: string;
  Orange_Cap?: string;
  Purple_Cap?: string;
  RANK?: number;
  team_ranking?: string;
}

export default function GameBoard() {
  const { 
    dealCards, 
    setGameData,
    gamePhase 
  } = useGameStore();
  
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch all the data we need from Convex
  const allCards = useQuery(api.cards.getAll);
  const boosters = useQuery(api.cards.getBoosters) as BoosterData[] | undefined;
  const teamRankings = useQuery(api.cards.getTeamRankings) as BoosterData[] | undefined;

  useEffect(() => {
    if (allCards && boosters && teamRankings) {
      // Set loading to false once all data is loaded
      setIsLoading(false);
      
      // Transform the cards to the expected format with all stats
      const formattedCards = allCards.map((card) => ({
        id: card._id,
        Player_Name: card.Player_Name,
        team: card.team || 'Unknown Team',
        stats: {
          // Batting stats
          Runs_Scored: card.Runs_Scored || 0,
          Batting_Average: card.Batting_Average || 0,
          Batting_Strike_Rate: card.Batting_Strike_Rate || 0,
          Centuries: card.Centuries || 0,
          Half_Centuries: card.Half_Centuries || 0,
          Sixes: card.Sixes || 0,
          Fours: card.Fours || 0,
          Highest_Score: card.Highest_Score || '0',
          
          // Bowling stats
          Wickets_Taken: card.Wickets_Taken || 0,
          Economy_Rate: card.Economy_Rate || 0,
          Bowling_Average: card.Bowling_Average || 0,
          Bowling_Strike_Rate: card.Bowling_Strike_Rate || 0,
          Four_Wicket_Hauls: card.Four_Wicket_Hauls || 0,
          Five_Wicket_Hauls: card.Five_Wicket_Hauls || 0,
        }
      }));
      
      // Shuffle cards and deal them to players
      const shuffledCards = [...formattedCards].sort(() => Math.random() - 0.5);
      dealCards(shuffledCards);
      
      // Set game data for boosters and team rankings
      if (boosters.length > 0 && teamRankings.length > 0) {
        // Find orange and purple cap holders
        const orangeCap = boosters.find(b => b.Orange_Cap)?.Orange_Cap || '';
        const purpleCap = boosters.find(b => b.Purple_Cap)?.Purple_Cap || '';
        
        // Create team rankings map
        const teamRankingsMap = teamRankings.reduce((map: Record<string, number>, team) => {
          if (team.team_ranking && team.RANK) {
            map[team.team_ranking] = team.RANK;
          }
          return map;
        }, {});
        
        // Set the game data
        setGameData(orangeCap, purpleCap, teamRankingsMap);
      }
    }
  }, [allCards, boosters, teamRankings, dealCards, setGameData]);

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
          {/* Game header - fixed at top */}
          <div className="absolute top-0 left-0 right-0 p-2 bg-blue-900/90 backdrop-blur-md z-10 border-b border-blue-700">
            <h1 className="text-2xl font-bold text-center text-white">IPL Cricket Cards Game</h1>
          </div>
          
          {/* Game phase indicator */}
          <div className="absolute top-14 left-1/2 transform -translate-x-1/2 bg-blue-800/80 backdrop-blur-sm px-4 py-1 rounded-full z-20">
            <span className="text-white font-medium">
              {gamePhase.replace('_', ' ').toUpperCase()} PHASE
            </span>
          </div>
          
          {/* Main game canvas - takes full height minus header space */}
          <div className="pt-12 h-full">
            <Canvas camera={{ position: [0, 5, 10], fov: 50 }}>
              <Suspense fallback={null}>
                <ambientLight intensity={0.7} />
                <pointLight position={[10, 10, 10]} intensity={1.0} />
                <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
                <CardHand />
              </Suspense>
            </Canvas>
          </div>
          
          {/* Game controls at the bottom */}
          <GameControls />
          
          {gamePhase === 'waiting' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
              <div className="bg-white/10 backdrop-blur-md p-8 rounded-lg text-center">
                <h2 className="text-3xl font-bold text-white mb-4">Welcome to IPL Cricket Cards</h2>
                <p className="text-white mb-6">Each player gets 5 cards. Select a stat to play with and compete against other players!</p>
                <button 
                  onClick={() => useGameStore.getState().startNewHand()}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold"
                >
                  Start Game
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}