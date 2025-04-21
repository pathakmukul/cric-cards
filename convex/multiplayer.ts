// ... (file unchanged until hand completion logic) ...
          stateUpdates.completedHands = [...completedHands, completedHandEntry];

          // --- NOW, check if the game should end ---
          console.log("[makeMove] Checking for game over. Current playerHands state:", JSON.stringify(playerHands));
          // New logic: Check if *all* players have 0 cards
          const isGameOver = Object.values(playerHands).every(hand => hand.length === 0);
          console.log(`[makeMove] isGameOver flag after check (all players empty?): ${isGameOver}`);

          if (isGameOver) {
                // --- Game Ends ---
                console.log("[makeMove] Game Over! Hand complete and ALL players have run out of cards.");
                stateUpdates.gamePhase = "game_over";
                stateUpdates.currentPlayer = undefined; // No current player when game is over
                stateUpdates.currentHand = undefined;
                stateUpdates.selectedStat = undefined;
                // Potentially determine overall winner based on scores here if needed
          } else {
                // --- Start Next Hand ---
                // Reset hand state for the next round
                stateUpdates.currentHand = undefined;
                stateUpdates.selectedStat = undefined;

                // Winner (or default) starts the next hand
                stateUpdates.currentPlayer = handWinnerId ?? lobby.players[0]; // Use the determined winner/default
                stateUpdates.gamePhase = "stat_selection";
                console.log(`[makeMove] Starting Hand ${stateUpdates.completedHands.length + 1}. Player ${stateUpdates.currentPlayer} selects stat.`);

                // Schedule bot move if the next player is a bot
                if (stateUpdates.currentPlayer && stateUpdates.currentPlayer.startsWith("Bot_")) {
                    console.log(`[makeMove] Scheduling bot move for ${stateUpdates.currentPlayer}`);
                    await ctx.scheduler.runAfter(0, api.multiplayer.checkBotMoves, { lobbyId: args.lobbyId });
                }
          }
      }
// ... (rest of the file unchanged) ...