// ... (file unchanged until line 263) ...
  // Defensive check: show loading if gamePhase or currentPlayer is not ready
  if ((!gamePhase || !currentPlayer) && gamePhase !== 'game_over') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-indigo-900 to-indigo-950 text-white">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <div className="text-lg">Waiting for game to start...</div>
        <div className="text-sm text-gray-400 mt-2">If this takes too long, try refreshing or rejoining the lobby.</div>
      </div>
    );
  }
// ... (rest of the file unchanged) ...