import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import LobbyPage from './components/LobbyPage';
import GameBoard from './components/GameBoard';
import MultiplayerGameBoard from './components/MultiplayerGameBoard';
import TeamDecorationShowcase from './components/decorations/TeamDecorationShowcase';
import { ConvexProvider, ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

function App() {
  return (
    <ConvexProvider client={convex}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/lobby" element={<LobbyPage />} />
        <Route path="/game" element={<GameBoard />} />
        <Route path="/multiplayer" element={<MultiplayerGameBoard />} />
        <Route path="/team-decorations" element={<TeamDecorationShowcase />} />
        <Route path="/pvp" element={<LobbyPage isPvP />} />
      </Routes>
    </ConvexProvider>
  );
}

export default App;