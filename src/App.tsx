import React from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import LobbyPage from './components/LobbyPage';
import GameBoard from './components/GameBoard';
import MultiplayerGameBoard from './components/MultiplayerGameBoard';
import TeamDecorationShowcase from './components/decorations/TeamDecorationShowcase';
import { ConvexProvider, ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

// Protected route component that prevents access to expired game URLs
const ProtectedGameRoute = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Check URL parameters for direct multiplayer links
  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const lobbyId = params.get('lobbyId');
    
    // If there's a lobbyId in the URL, check if it's valid
    if (lobbyId) {
      // Store the last time this lobby was accessed
      const lastAccessKey = `lobby_${lobbyId}_lastAccess`;
      const lastAccess = localStorage.getItem(lastAccessKey);
      const now = Date.now();
      
      if (lastAccess) {
        const lastAccessTime = parseInt(lastAccess, 10);
        const FIVE_MINUTES = 5 * 60 * 1000;
        
        // If the lobby hasn't been accessed in 5 minutes, redirect to home
        if (now - lastAccessTime > FIVE_MINUTES) {
          alert("This game session has expired. Redirecting to home page.");
          navigate('/');
          return;
        }
      }
      
      // Update the last access time
      localStorage.setItem(lastAccessKey, now.toString());
    }
  }, [location, navigate]);
  
  return <>{children}</>;
};

function App() {
  return (
    <ConvexProvider client={convex}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/lobby" element={<LobbyPage />} />
        <Route path="/game" element={<GameBoard />} />
        <Route path="/multiplayer" element={
          <ProtectedGameRoute>
            <MultiplayerGameBoard />
          </ProtectedGameRoute>
        } />
        <Route path="/team-decorations" element={<TeamDecorationShowcase />} />
        <Route path="/pvp" element={<LobbyPage isPvP />} />
      </Routes>
    </ConvexProvider>
  );
}

export default App;