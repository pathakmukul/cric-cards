import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import GameBoard from './components/GameBoard';
import TeamDecorationShowcase from './components/decorations/TeamDecorationShowcase';
import { ConvexProvider, ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

function App() {
  return (
    <ConvexProvider client={convex}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/game" element={<GameBoard />} />
        <Route path="/team-decorations" element={<TeamDecorationShowcase />} />
      </Routes>
    </ConvexProvider>
  );
}

export default App;