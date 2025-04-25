import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { DatabaseReader, DatabaseWriter } from "./_generated/server";
import { api } from "./_generated/api";

// --- Type Definitions (Derived from Schema) ---
// Using types derived from schema is generally safer
type PlayerHandsMap = Record<string, Array<Id<"iplstats">>>;
type PlayerScoresMap = Record<string, number>;
type PlayerBoostersMap = Record<string, { orange: boolean, purple: boolean, teamrank: boolean }>;
type TeamRankingsMap = Record<string, number>;
type BoosterType = "orange" | "purple" | "teamrank";

// Type for a single played card within a hand (matches schema)
type PlayedCard = {
    playerId: string;
    cardId: Id<"iplstats">;
    cardName: string;
    boosterUsed?: BoosterType;
    rawValue: number;
    finalValue: number;
};

// Type for the current hand state (matches schema)
type CurrentHandState = {
    statSelector: string;
    playedCards: PlayedCard[];
  leadingCard?: {
    playerId: string;
        cardId: Id<"iplstats">;
        cardName: string;
    finalValue: number;
  };
};

// Type for a completed hand entry (matches schema)
type CompletedHandEntry = {
    statSelector: string;
    selectedStat: string;
    playedCards: PlayedCard[];
    winner: {
        playerId: string;
        cardId: Id<"iplstats">;
        cardName: string;
        finalValue: number;
    } | null;
};

// --- Helper Functions ---

// Function to shuffle an array (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Type guard to check if a value is a valid stat key for iplstats
function isValidStatKey(stat: string, card: Doc<"iplstats">): stat is keyof Doc<"iplstats"> {
  // Add check to prevent accessing internal Convex fields like _id, _creationTime
  return !stat.startsWith('_') && stat in card;
}

// Calculate Stat Value - Fetches card data
async function calculateStatValue(
  ctx: { db: DatabaseReader },
  cardId: Id<"iplstats">,
  stat: string,
  booster: BoosterType | undefined | null,
  lobby: Doc<"game_lobbies">,
): Promise<{ rawValue: number, finalValue: number }> {

  const card = await ctx.db.get(cardId);
  if (!card) {
    console.error(`[calculateStatValue] Card not found: ${cardId}`);
    // Consider throwing an error here for makeMove to catch
    return { rawValue: 0, finalValue: 0 };
  }

  // Use type guard before accessing potentially invalid stat key
  if (!isValidStatKey(stat, card)) {
     console.error(`[calculateStatValue] Invalid stat key '${stat}' for card ${cardId}`);
     // Consider throwing an error here
     return { rawValue: 0, finalValue: 0 };
  }

  // Safely access the stat value
  const baseValueStrOrNum = card[stat];
  let baseValue = typeof baseValueStrOrNum === 'string'
    ? parseFloat(baseValueStrOrNum) || 0
    : typeof baseValueStrOrNum === 'number' ? baseValueStrOrNum : 0; // Ensure it's a number

  let multiplier = 1.0;
  const orangeCapPlayer = lobby.orangeCapPlayer;
  const purpleCapPlayer = lobby.purpleCapPlayer;
  const teamRankings = lobby.teamRankings as TeamRankingsMap | undefined;

  // Booster checks (logic remains the same)
  const isOrangeCapPlayer = orangeCapPlayer === card.Player_Name;
  const isBattingStat = ['Runs_Scored', 'Batting_Average', 'Batting_Strike_Rate', 'Centuries', 'Half_Centuries', 'Sixes', 'Fours'].includes(stat);
  if (booster === 'orange' || (isOrangeCapPlayer && isBattingStat)) {
    multiplier *= 1.2;
  }
  const isPurpleCapPlayer = purpleCapPlayer === card.Player_Name;
  const isBowlingStat = ['Wickets_Taken', 'Economy_Rate', 'Bowling_Average', 'Bowling_Strike_Rate', 'Four_Wicket_Hauls', 'Five_Wicket_Hauls'].includes(stat);
  if (booster === 'purple' || (isPurpleCapPlayer && isBowlingStat)) {
    multiplier *= 1.2;
  }
  if (booster === 'teamrank' && card.team && teamRankings && teamRankings[card.team]) {
    const rank = teamRankings[card.team];
    if (rank === 1) multiplier *= 1.4;
    else if (rank === 2) multiplier *= 1.3;
    else if (rank === 3) multiplier *= 1.2;
    else if (rank === 4) multiplier *= 1.1;
  }

  const finalValue = baseValue * multiplier;
  return { rawValue: baseValue, finalValue };
}

// Determine Hand Winner Info - Returns structured winner info or null
function determineHandWinnerInfo(hand: CurrentHandState | undefined | null, stat: string | undefined | null): CompletedHandEntry['winner'] { // Return type matches schema field
    if (!hand || !hand.playedCards || hand.playedCards.length === 0 || !stat) {
        console.warn("[determineHandWinnerInfo] Invalid input for determining winner.", { handExists: !!hand, stat });
        return null;
    }

    const lowerIsBetter = [
        "Economy_Rate",
        "Bowling_Average",
        "Bowling_Strike_Rate",
    ].includes(stat);

    let bestPlay: PlayedCard | null = null;
    let bestValue = lowerIsBetter ? Infinity : -Infinity;

    for (const play of hand.playedCards) {
        // Use finalValue directly as it should be a number
        const finalValue = play.finalValue;

        if (lowerIsBetter) {
            if (finalValue < bestValue) {
                bestValue = finalValue;
                bestPlay = play;
            }
        } else {
            if (finalValue > bestValue) {
                bestValue = finalValue;
                bestPlay = play;
            }
        }
    }

    if (!bestPlay) {
        console.warn("[determineHandWinnerInfo] Could not determine best play.");
        return null;
    }

    // Return the structured winner info based on schema
    return {
        playerId: bestPlay.playerId,
        cardId: bestPlay.cardId,
        cardName: bestPlay.cardName,
        finalValue: bestPlay.finalValue
    };
}

// --- Mutations and Queries (createLobby, joinLobby, getLobbyData, getMyLobbies, startGame remain the same) ---

export const createLobby = mutation({
  args: {
    playerName: v.string(),
  },
  handler: async (ctx, args) => {
    const lobbyId = Math.random().toString(36).substring(2, 7).toUpperCase();
    
    const initialPlayerBoosters: Record<string, { orange: boolean, purple: boolean, teamrank: boolean }> = {
      [args.playerName]: { orange: true, purple: true, teamrank: true }
    };
    const initialPlayerScores: Record<string, number> = { [args.playerName]: 0 };

    const newLobbyId = await ctx.db.insert("game_lobbies", {
      lobbyId,
      players: [args.playerName],
      hostPlayerName: args.playerName, // Store the host
      status: "waiting",
      createdAt: Date.now(),
      gameStarted: false,
      // Initialize game state fields as optional or with defaults
      currentPlayer: undefined,
      gamePhase: undefined,
      playerHands: undefined,
      selectedStat: undefined,
      currentHand: undefined,
      completedHands: [],
      playerScores: initialPlayerScores,
      playerBoosters: initialPlayerBoosters,
      orangeCapPlayer: undefined,
      purpleCapPlayer: undefined,
      teamRankings: undefined,
      lastMoveTime: Date.now(),
    });
    
    return { lobbyId, id: newLobbyId }; // Return the generated lobbyId and the Convex _id
  },
});

export const joinLobby = mutation({
  args: {
    lobbyId: v.string(),
    playerName: v.string(),
  },
  handler: async (ctx, args) => {
    const lobby = await ctx.db
      .query("game_lobbies")
      .withIndex("by_lobbyId", q => q.eq("lobbyId", args.lobbyId))
      .first();
    
    if (!lobby) throw new Error(`Lobby ${args.lobbyId} not found`);
    
    // Check if lobby is expired
    if (isLobbyExpired(lobby)) {
      // Optionally delete the expired lobby
      await ctx.db.delete(lobby._id);
      throw new Error("Lobby has expired. Please create or join a new lobby.");
    }
    
    if (lobby.gameStarted) throw new Error("Game already started");
    if (lobby.players.length >= 4) throw new Error("Lobby is full");
    if (lobby.players.includes(args.playerName)) return { success: true, lobbyId: args.lobbyId }; // Already joined

    const updatedPlayers = [...lobby.players, args.playerName];
    
    // Initialize scores and boosters for the joining player
    const playerScores = (lobby.playerScores ?? {}) as Record<string, number>;
    playerScores[args.playerName] = 0;

    const playerBoosters = (lobby.playerBoosters ?? {}) as Record<string, { orange: boolean, purple: boolean, teamrank: boolean }>;
    playerBoosters[args.playerName] = { orange: true, purple: true, teamrank: true };
    
    await ctx.db.patch(lobby._id, {
      players: updatedPlayers,
      playerScores,
      playerBoosters,
      lastMoveTime: Date.now(),
    });
    
    return { success: true, lobbyId: args.lobbyId };
  },
});

export const getLobbyData = query({
  args: {
    lobbyId: v.string(),
  },
  handler: async (ctx, args) => {
    const lobby = await ctx.db
      .query("game_lobbies")
      .withIndex("by_lobbyId", q => q.eq("lobbyId", args.lobbyId))
      .first();
      
    // Check if lobby is expired
    if (isLobbyExpired(lobby)) {
      // Don't return expired lobbies
      return null;
    }
      
    return lobby;
  },
});

export const getMyLobbies = query({
  args: {
    playerName: v.string(),
  },
  handler: async (ctx, args) => {
    // Use the by_player index - NOTE: This index checks if the player *array* exactly matches.
    // A more robust approach might involve a separate "playerLobbies" table or filtering after fetching.
    // For now, fetching all non-completed and filtering in memory is acceptable for small scale.
    const lobbies = await ctx.db
      .query("game_lobbies")
      .filter(q => q.neq(q.field("status"), "completed"))
      .filter(q => q.neq(q.field("status"), "abandoned")) // Also exclude abandoned
      .collect();

    // Filter in memory
    const myLobbies = lobbies.filter(lobby => lobby.players.includes(args.playerName));
    return myLobbies;
  },
});

export const resetGame = mutation({
  args: {
    lobbyId: v.string(),
    playerName: v.string(), // Host resetting the game
    orangeCapPlayer: v.optional(v.string()),
    purpleCapPlayer: v.optional(v.string()),
    teamRankings: v.any(), // Use v.any() as defined in schema
    availableCards: v.array(v.id("iplstats")), // Array of Card IDs
  },
  handler: async (ctx, args) => {
    const lobby = await ctx.db
      .query("game_lobbies")
      .withIndex("by_lobbyId", q => q.eq("lobbyId", args.lobbyId))
      .first();
    
    if (!lobby) throw new Error(`Lobby ${args.lobbyId} not found`);
    if (lobby.hostPlayerName !== args.playerName) throw new Error("Only the host can reset the game");
    if (lobby.gamePhase !== "game_over") throw new Error("Can only reset a game that has ended");
    
    // --- Prepare Game Setup ---
    let updatedPlayers = [...lobby.players];
    let initialPlayerScores: Record<string, number> = {};
    let initialPlayerBoosters: Record<string, { orange: boolean, purple: boolean, teamrank: boolean }> = {};
    
    // Reset all player scores and boosters
    updatedPlayers.forEach(player => {
      initialPlayerScores[player] = 0;
      initialPlayerBoosters[player] = { orange: true, purple: true, teamrank: true };
    });
    
    // Fill remaining slots with bots if needed
    while (updatedPlayers.length < 4) {
      const botName = `Bot ${updatedPlayers.length + 1}`;
      updatedPlayers.push(botName);
      initialPlayerScores[botName] = 0;
      initialPlayerBoosters[botName] = { orange: true, purple: true, teamrank: true };
    }
    
    // --- Deal Cards ---
    const cardsPerPlayer = 5;
    const requiredCards = updatedPlayers.length * cardsPerPlayer;
    if (args.availableCards.length < requiredCards) {
      throw new Error(`Not enough unique cards available to deal ${cardsPerPlayer} to ${updatedPlayers.length} players.`);
    }

    const shuffledCardIds = shuffleArray(args.availableCards);
    const playerHands: Record<string, string[]> = {};
    updatedPlayers.forEach((player, index) => {
      const startIndex = index * cardsPerPlayer;
      const hand = shuffledCardIds.slice(startIndex, startIndex + cardsPerPlayer);
      playerHands[player] = hand;
    });
    
    // --- Update Lobby State for Game Restart ---
    await ctx.db.patch(lobby._id, {
      players: updatedPlayers,
      playerScores: initialPlayerScores,
      playerBoosters: initialPlayerBoosters,
      playerHands: playerHands,
      gameStarted: true,
      status: "in_progress",
      currentPlayer: updatedPlayers[0], // First player starts
      gamePhase: "stat_selection",
      completedHands: [], // Reset completed hands
      currentHand: undefined, // Reset current hand
      selectedStat: undefined, // Reset selected stat
      orangeCapPlayer: args.orangeCapPlayer,
      purpleCapPlayer: args.purpleCapPlayer,
      teamRankings: args.teamRankings as Record<string, number>,
      lastMoveTime: Date.now(),
    });
    
    console.log(`Game reset in lobby ${args.lobbyId} by ${args.playerName}`);
    return { success: true };
  },
});

export const startGame = mutation({
  args: {
    lobbyId: v.string(),
    playerName: v.string(), // Host starting the game
    orangeCapPlayer: v.optional(v.string()),
    purpleCapPlayer: v.optional(v.string()),
    teamRankings: v.any(), // Use v.any() as defined in schema
    availableCards: v.array(v.id("iplstats")), // Array of Card IDs
  },
  handler: async (ctx, args) => {
    const lobby = await ctx.db
      .query("game_lobbies")
      .withIndex("by_lobbyId", q => q.eq("lobbyId", args.lobbyId))
      .first();
    
    if (!lobby) throw new Error(`Lobby ${args.lobbyId} not found`);
    
    // Check if lobby is expired
    if (isLobbyExpired(lobby)) {
      // Optionally delete the expired lobby
      await ctx.db.delete(lobby._id);
      throw new Error("Lobby has expired. Please create or join a new lobby.");
    }
    
    if (lobby.gameStarted) throw new Error("Game already started");
    if (lobby.hostPlayerName !== args.playerName) throw new Error("Only the host can start the game");
    if (lobby.players.length < 2) throw new Error("Need at least 2 players to start");

    // --- Prepare Game Setup ---
    let updatedPlayers = [...lobby.players];
    const initialPlayerScores: Record<string, number> = { ...(lobby.playerScores as Record<string, number>) };
    const initialPlayerBoosters: Record<string, { orange: boolean, purple: boolean, teamrank: boolean }> = { ...(lobby.playerBoosters as Record<string, { orange: boolean, purple: boolean, teamrank: boolean }>) };
    
    // Fill remaining slots with bots
    while (updatedPlayers.length < 4) {
      const botName = `Bot ${updatedPlayers.length + 1}`;
      updatedPlayers.push(botName);
      initialPlayerScores[botName] = 0;
      initialPlayerBoosters[botName] = { orange: true, purple: true, teamrank: true };
    }
    
    // --- Deal Cards ---
    const cardsPerPlayer = 5;
    const requiredCards = updatedPlayers.length * cardsPerPlayer;
    if (args.availableCards.length < requiredCards) {
      // TODO: Decide how to handle insufficient cards. Duplicate? Error? For now, error.
      console.error(`Insufficient cards: ${args.availableCards.length} provided, ${requiredCards} needed.`);
      throw new Error(`Not enough unique cards available to deal ${cardsPerPlayer} to ${updatedPlayers.length} players.`);
    }

    const shuffledCardIds = shuffleArray(args.availableCards);
    const playerHands: Record<string, string[]> = {};
    updatedPlayers.forEach((player, index) => {
      const startIndex = index * cardsPerPlayer;
      const hand = shuffledCardIds.slice(startIndex, startIndex + cardsPerPlayer);
      playerHands[player] = hand;
    });

    // --- Update Lobby State for Game Start ---
    await ctx.db.patch(lobby._id, {
      players: updatedPlayers, // Include bots
      playerScores: initialPlayerScores,
      playerBoosters: initialPlayerBoosters,
      playerHands: playerHands,
      gameStarted: true,
      status: "in_progress",
      currentPlayer: updatedPlayers[0], // First player starts
      gamePhase: "stat_selection",
      completedHands: [], // Ensure it's reset
      currentHand: undefined, // Ensure it's reset
      selectedStat: undefined, // Ensure it's reset
      orangeCapPlayer: args.orangeCapPlayer,
      purpleCapPlayer: args.purpleCapPlayer,
      teamRankings: args.teamRankings as Record<string, number>, // Store provided rankings
      lastMoveTime: Date.now(),
    });
    
    console.log(`Game started in lobby ${args.lobbyId} by ${args.playerName}`);
    return { success: true };
  },
});

// --- Core Game Logic Mutation ---
export const makeMove = mutation({
  args: {
    lobbyId: v.string(),
    playerName: v.string(),
    action: v.union(
      v.literal("select_stat"), 
      v.literal("play_card"),
      v.literal("select_and_play")
    ),
    selectedStat: v.optional(v.string()),
    selectedCardId: v.optional(v.id("iplstats")),
    useBooster: v.optional(v.union(
        v.literal("orange"),
        v.literal("purple"),
        v.literal("teamrank")
    )),
  },
  handler: async (ctx, args) => {
    const lobby = await ctx.db
      .query("game_lobbies")
      .withIndex("by_lobbyId", q => q.eq("lobbyId", args.lobbyId))
      .first();
    
    // --- Validation ---
    if (!lobby) throw new Error(`[makeMove] Lobby ${args.lobbyId} not found`);
    if (!lobby.gameStarted || lobby.status !== "in_progress") throw new Error("[makeMove] Game not active");
    // Ensure currentPlayer is defined before comparing
    if (!lobby.currentPlayer) throw new Error("[makeMove] Game state error: currentPlayer is not set.");
    
    // Special handling for the select_and_play and play_card actions
    // - select_and_play: validation happens inside the handler
    // - play_card: we'll use a more permissive approach to avoid race conditions
    if (args.action !== "select_and_play" && args.action !== "play_card") {
      // Standard turn validation for other actions
      if (lobby.currentPlayer !== args.playerName) {
        throw new Error(`[makeMove] Not ${args.playerName}'s turn (Current: ${lobby.currentPlayer})`);
      }
    }

    // --- Prepare State (with type safety) ---
    const playerHands = lobby.playerHands as PlayerHandsMap ?? {};
    const playerBoosters = lobby.playerBoosters as PlayerBoostersMap ?? {};
    const playerScores = lobby.playerScores as PlayerScoresMap ?? {};
    const completedHands = lobby.completedHands as CompletedHandEntry[] ?? [];
    const currentPlayer = lobby.currentPlayer; // Known to be string now
    const currentPhase = lobby.gamePhase;
    const currentHandState = lobby.currentHand as CurrentHandState | undefined;

    // Object to collect state changes for the final patch
    const stateUpdates: Partial<Doc<"game_lobbies">> = {
        lastMoveTime: Date.now(),
    };

    // --- Action: Select Stat ---
    if (args.action === "select_stat") {
      if (currentPhase !== "stat_selection") throw new Error("[makeMove] Not the time to select a stat");
      if (!args.selectedStat) throw new Error("[makeMove] No stat selected");
      // TODO: Maybe validate selectedStat against a known list of valid stats?

      const newlySelectedStat = args.selectedStat;
      stateUpdates.selectedStat = newlySelectedStat;
      stateUpdates.gamePhase = "card_selection";
      // Turn does not *initially* advance, but might if a card is played immediately
      console.log(`[makeMove] Player ${args.playerName} selected stat: ${newlySelectedStat}`);

      // --- If a card was also provided (Bot's first move) --- 
      if (args.selectedCardId) {
        console.log(`[makeMove] Bot ${args.playerName} also playing card ${args.selectedCardId} immediately after stat selection.`);
        const hand = playerHands[currentPlayer]; // currentPlayer is the bot here
        if (!hand || !hand.includes(args.selectedCardId)) throw new Error(`[makeMove] Bot ${currentPlayer} does not have card ${args.selectedCardId} for immediate play`);
        
        // Fetch card and calculate value
        const cardData = await ctx.db.get(args.selectedCardId);
        if (!cardData) throw new Error(`[makeMove] Card data not found for ${args.selectedCardId}`);

        // Use the stat that was JUST selected
        const { rawValue, finalValue } = await calculateStatValue(
            ctx, args.selectedCardId, newlySelectedStat, undefined, lobby // Bot doesn't use booster on first move currently
        );

        const playedCardInfo: PlayedCard = {
          playerId: currentPlayer,
          cardId: args.selectedCardId,
          cardName: cardData.Player_Name ?? "Unknown Card",
          // boosterUsed: undefined, // Bot doesn't use booster first move
          rawValue: rawValue,
          finalValue: finalValue,
        };

        // Initialize currentHandState if it doesn't exist (should always exist here, but safety check)
        if (!currentHandState) {
            stateUpdates.currentHand = { 
                statSelector: newlySelectedStat,
                playedCards: [playedCardInfo],
            };
        } else {
            currentHandState.playedCards.push(playedCardInfo);
            stateUpdates.currentHand = currentHandState; // Mark for update
        }

        // Update player's hand (remove played card)
        const updatedHand = hand.filter(cardId => cardId !== args.selectedCardId);
        playerHands[currentPlayer] = updatedHand;
        stateUpdates.playerHands = playerHands; // Mark for update

        // --- Determine Next Player (Turn Advances) ---
        const playerIndex = lobby.players.indexOf(currentPlayer);
        if (playerIndex === -1) throw new Error(`[makeMove] Player ${currentPlayer} not found in lobby players list`);
        const nextPlayerIndex = (playerIndex + 1) % lobby.players.length;
        stateUpdates.currentPlayer = lobby.players[nextPlayerIndex];
        console.log(`[makeMove] Turn advances to ${stateUpdates.currentPlayer} after bot's immediate card play.`);
        
        // NOTE: We are NOT checking for hand end here, as only one card (the bot's) has been played.
      }
    }
    // --- Action: Play Card ---
    else if (args.action === "play_card") {
      if (currentPhase !== "card_selection") throw new Error("[makeMove] Not the time to play a card");
      if (!lobby.selectedStat) throw new Error("[makeMove] No stat has been selected for this hand");
      if (!args.selectedCardId) throw new Error("[makeMove] No card selected");

      // Add explicit type assertion since we've already checked it's not null/undefined
      const currentSelectedStat = lobby.selectedStat as string;
      
      // Custom validation for play_card - allows a player to play if they have a valid card
      // This is more flexible than requiring it to be exactly their turn
      // If the player isn't the current player, at least validate they're a participant
      if (lobby.currentPlayer !== args.playerName && !lobby.players.includes(args.playerName)) {
        throw new Error(`[makeMove] Player ${args.playerName} is not part of this game`);
      }
      
      // Check that the player has the specified card (using the player's name, not currentPlayer)
      const playCardHandCheck = playerHands[args.playerName] || [];
      if (!playCardHandCheck.includes(args.selectedCardId)) {
        throw new Error(`[makeMove] Player ${args.playerName} does not have card ${args.selectedCardId}`);
      }

      const boosterToUse = args.useBooster ?? undefined;
      if (boosterToUse) {
          if (!playerBoosters[args.playerName]) throw new Error(`[makeMove] Player ${args.playerName} has no booster state.`);
          if (!playerBoosters[args.playerName][boosterToUse]) throw new Error(`[makeMove] Booster ${boosterToUse} not available or already used by ${args.playerName}`);
      }

      // Fetch card and calculate value
      const cardData = await ctx.db.get(args.selectedCardId);
      if (!cardData) throw new Error(`[makeMove] Card data not found for ${args.selectedCardId}`);

      const { rawValue, finalValue } = await calculateStatValue(
          ctx, args.selectedCardId, currentSelectedStat, boosterToUse, lobby
      );

      const playedCardInfo: PlayedCard = {
        playerId: args.playerName,
        cardId: args.selectedCardId,
        cardName: cardData.Player_Name ?? "Unknown Card",
        boosterUsed: boosterToUse,
        rawValue: rawValue,
        finalValue: finalValue,
      };

      // Update player's hand (remove played card)
      const playCardCurrentHand = playerHands[args.playerName] || [];
      const updatedHand = playCardCurrentHand.filter((cardId: Id<"iplstats">) => cardId !== args.selectedCardId);
      playerHands[args.playerName] = updatedHand;
      stateUpdates.playerHands = playerHands; // Mark for update

      // Update booster state if used
      if (boosterToUse) {
        playerBoosters[args.playerName][boosterToUse] = false;
        stateUpdates.playerBoosters = playerBoosters; // Mark for update
      }

      // Update currentHand in lobby state
      let updatedCurrentHand: CurrentHandState;
      if (!currentHandState) {
        // First card played in this hand
          updatedCurrentHand = {
              statSelector: args.playerName, // The player who plays the first card after stat selection initiated the comparison
              playedCards: [playedCardInfo],
              leadingCard: { // The first card is automatically the leader
                  playerId: args.playerName,
                  cardId: args.selectedCardId,
                  cardName: playedCardInfo.cardName,
                  finalValue: finalValue
          }
        };
      } else {
          // Subsequent card played in this hand
          updatedCurrentHand = {
              ...currentHandState,
              playedCards: [...currentHandState.playedCards, playedCardInfo],
          };
          // Update leading card
          const currentLeading = updatedCurrentHand.leadingCard;
          const lowerIsBetter = ["Economy_Rate", "Bowling_Average", "Bowling_Strike_Rate"].includes(currentSelectedStat);
          let isNewLead = false;
          if (!currentLeading) {
              isNewLead = true; // Should not happen if currentHandState exists, but safe check
        } else {
              if (lowerIsBetter && finalValue < currentLeading.finalValue) isNewLead = true;
              if (!lowerIsBetter && finalValue > currentLeading.finalValue) isNewLead = true;
          }
          if (isNewLead) {
              updatedCurrentHand.leadingCard = { playerId: args.playerName, cardId: args.selectedCardId, cardName: playedCardInfo.cardName, finalValue: finalValue };
          }
      }
      stateUpdates.currentHand = updatedCurrentHand;

      // --- Advance Turn & Check Hand/Game End ---
      const currentPlayerIndex = lobby.players.indexOf(currentPlayer);
      const nextPlayerIndex = (currentPlayerIndex + 1) % lobby.players.length;
      stateUpdates.currentPlayer = lobby.players[nextPlayerIndex];

      console.log(`[makeMove] Player ${currentPlayer} played card ${args.selectedCardId}. Next turn: ${stateUpdates.currentPlayer}`);

      // Check if hand ended (everyone played)
      if (updatedCurrentHand.playedCards.length === lobby.players.length) {
          console.log(`[makeMove] Hand ended. Stat: ${currentSelectedStat}`);
          const winnerInfo = determineHandWinnerInfo(updatedCurrentHand, currentSelectedStat);

          let handWinnerId: string | null = null;
          if (winnerInfo) {
              handWinnerId = winnerInfo.playerId;
              console.log(`[makeMove] Hand winner: ${handWinnerId} with card ${winnerInfo.cardName} (${winnerInfo.finalValue})`);
              playerScores[handWinnerId] = (playerScores[handWinnerId] ?? 0) + 1;
              stateUpdates.playerScores = playerScores; // Mark for update
          } else {
              console.warn("[makeMove] Could not determine hand winner (draw or error). No score awarded.");
              handWinnerId = lobby.players[0]; // Default to first player if draw
          }

          // Add this completed hand to the history
          const completedHandEntry: CompletedHandEntry = {
              statSelector: updatedCurrentHand.statSelector,
              selectedStat: currentSelectedStat,
              playedCards: updatedCurrentHand.playedCards,
              winner: winnerInfo // Store the detailed winner info or null
          };
          stateUpdates.completedHands = [...completedHands, completedHandEntry];

          // --- NOW, check if the game should end ---
          console.log("[makeMove] Checking for game over. Current playerHands state:", JSON.stringify(playerHands));
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
      } else {
        // Hand continues, next player plays a card
        stateUpdates.gamePhase = "card_selection";
      }
    }
    // --- Action: Combined Select Stat and Play Card ---
    else if (args.action === "select_and_play") {
      // Validate it's the player's turn (only once for both operations)
      if (lobby.currentPlayer !== args.playerName) {
        throw new Error(`[makeMove] Not ${args.playerName}'s turn (Current: ${lobby.currentPlayer})`);
      }
      if (currentPhase !== "stat_selection") throw new Error("[makeMove] Not the time to select a stat and play card");
      if (!args.selectedStat) throw new Error("[makeMove] No stat selected for combined action");
      if (!args.selectedCardId) throw new Error("[makeMove] No card selected for combined action");
      
      // 1. First, handle the stat selection
      const newlySelectedStat = args.selectedStat;
      stateUpdates.selectedStat = newlySelectedStat;
      stateUpdates.gamePhase = "card_selection";
      console.log(`[makeMove] Player ${args.playerName} selected stat: ${newlySelectedStat} with combined action`);
      
      // 2. Immediately handle the card play (similar to play_card action)
      const selectAndPlayHand = playerHands[args.playerName] || [];
      if (!selectAndPlayHand.includes(args.selectedCardId)) {
        throw new Error(`[makeMove] Player ${args.playerName} does not have card ${args.selectedCardId}`);
      }
      
      // Check booster if provided
      const boosterToUse = args.useBooster ?? undefined;
      if (boosterToUse) {
        if (!playerBoosters[args.playerName]) {
          throw new Error(`[makeMove] Player ${args.playerName} has no booster state.`);
        }
        if (!playerBoosters[args.playerName][boosterToUse]) {
          throw new Error(`[makeMove] Booster ${boosterToUse} not available or already used by ${args.playerName}`);
        }
      }
      
      // Fetch card and calculate value using the stat that was JUST selected
      const cardData = await ctx.db.get(args.selectedCardId);
      if (!cardData) throw new Error(`[makeMove] Card data not found for ${args.selectedCardId}`);
      
      // Ensure newlySelectedStat is treated as a string for the calculateStatValue function
      if (!newlySelectedStat) throw new Error("[makeMove] Selected stat is undefined or empty");
      const { rawValue, finalValue } = await calculateStatValue(
        ctx, args.selectedCardId, newlySelectedStat as string, boosterToUse, lobby
      );
      
      const playedCardInfo: PlayedCard = {
        playerId: args.playerName,
        cardId: args.selectedCardId,
        cardName: cardData.Player_Name ?? "Unknown Card",
        boosterUsed: boosterToUse,
        rawValue: rawValue,
        finalValue: finalValue,
      };
      
      // Update player's hand (remove played card)
      const playCardCurrentHand = playerHands[args.playerName] || [];
      const selectAndPlayUpdatedHand = playCardCurrentHand.filter((cardId: Id<"iplstats">) => cardId !== args.selectedCardId);
      playerHands[args.playerName] = selectAndPlayUpdatedHand;
      stateUpdates.playerHands = playerHands; // Mark for update
      
      // Update booster state if used
      if (boosterToUse) {
        playerBoosters[args.playerName][boosterToUse] = false;
        stateUpdates.playerBoosters = playerBoosters; // Mark for update
      }
      
      // Update currentHand in lobby state according to schema
      // Note: selectedStat is stored at the top level of the document (already set above)
      // while statSelector is stored within the currentHand object
      let updatedCurrentHand: CurrentHandState = {
        statSelector: currentPlayer, // The player who played the first card selected the stat
        playedCards: [playedCardInfo],
        leadingCard: { // The first card is automatically the leader
          playerId: currentPlayer,
          cardId: args.selectedCardId,
          cardName: playedCardInfo.cardName,
          finalValue: finalValue
        }
      };
      
      stateUpdates.currentHand = updatedCurrentHand;
      
      // --- Advance Turn ---
      const currentPlayerIndex = lobby.players.indexOf(currentPlayer);
      const nextPlayerIndex = (currentPlayerIndex + 1) % lobby.players.length;
      stateUpdates.currentPlayer = lobby.players[nextPlayerIndex];
      
      console.log(`[makeMove] Player ${currentPlayer} combined select stat ${newlySelectedStat} and play card ${args.selectedCardId}. Next turn: ${stateUpdates.currentPlayer}`);
      
      // Continue with card_selection phase for next player
      stateUpdates.gamePhase = "card_selection";
      
      // NOTE: Since this is always the first card of a hand, we don't need to check for hand end yet
    }
    // --- Invalid Action ---
    else {
        throw new Error("[makeMove] Invalid action specified");
    }

    // Apply all updates
    await ctx.db.patch(lobby._id, stateUpdates);
    console.log(`[makeMove] Patched lobby ${lobby.lobbyId} with updates:`, stateUpdates);

    // --- Trigger Bot Move If Necessary ---
    const nextPlayerName = stateUpdates.currentPlayer;
    // Check if the *next* player is a bot and the game is still in progress
    if (nextPlayerName?.startsWith("Bot ") && stateUpdates.status !== "completed" && stateUpdates.gamePhase !== "game_over") {
       console.log(`[makeMove] Scheduling bot move for ${nextPlayerName}`);
       // Schedule the bot move check to run shortly after the current mutation finishes
       await ctx.scheduler.runAfter(500, api.multiplayer.checkBotMoves, { lobbyId: args.lobbyId });
    }

    return { success: true };
  },
});

// Check Bot Moves - Runs as a separate mutation, often scheduled
export const checkBotMoves = mutation({
    args: { lobbyId: v.string() },
    handler: async (ctx, args) => {
    const lobby = await ctx.db
      .query("game_lobbies")
          .withIndex("by_lobbyId", q => q.eq("lobbyId", args.lobbyId))
      .first();
    
        // Extra checks: Game active? Is it actually a bot's turn?
        if (!lobby || lobby.status !== 'in_progress' || !lobby.currentPlayer?.startsWith("Bot ")) {
            // Log only if lobby exists, otherwise it might be noise during cleanup
            if (lobby) {
                console.log(`[checkBotMoves] No action needed for lobby ${args.lobbyId}. Status: ${lobby.status}, Player: ${lobby.currentPlayer}`);
            }
            return; // Not a bot's turn or game not active
        }

        const botName = lobby.currentPlayer;
        console.log(`[checkBotMoves] Triggered for bot ${botName} in lobby ${args.lobbyId}, phase: ${lobby.gamePhase}`);

        // --- Basic Bot Decision Logic ---
        try {
            if (lobby.gamePhase === "stat_selection") {
                const playerHands = lobby.playerHands as PlayerHandsMap;
                const botHand = playerHands?.[botName];
                if (botHand && botHand.length > 0) {
                    // Bot needs to select a stat AND play their first card
                    const availableStats = ['Batting_Average', 'Runs_Scored', 'Wickets_Taken', 'Economy_Rate', 'Batting_Strike_Rate', 'Catches', 'Fours', 'Sixes']; // Add more stats if needed
                    const randomStat = availableStats[Math.floor(Math.random() * availableStats.length)];
                    const cardToPlay = botHand[0]; // Play the first card

                    console.log(`[checkBotMoves] Bot ${botName} choosing stat: ${randomStat} and playing card: ${cardToPlay}`);

                    // Schedule makeMove with BOTH stat and card
                    await ctx.scheduler.runAfter(0, api.multiplayer.makeMove, { 
                        lobbyId: args.lobbyId,
                        playerName: botName,
                        action: "select_stat",
                        selectedStat: randomStat,
                        selectedCardId: cardToPlay, // Pass the card ID here
                    });
                } else {
                    console.error(`[checkBotMoves] Bot ${botName} cannot select stat - no cards in hand!`);
                }
            } else if (lobby.gamePhase === "card_selection") {
                const playerHands = lobby.playerHands as PlayerHandsMap;
                const botHand = playerHands?.[botName];
                if (botHand && botHand.length > 0) {
                    // Bot responds to a stat: Select a random card from the bot's hand
                    const randomIndex = Math.floor(Math.random() * botHand.length);
                    const cardToPlay = botHand[randomIndex];
                    console.log(`[checkBotMoves] Bot ${botName} randomly playing card: ${cardToPlay} for stat: ${lobby.currentHand?.statSelector}`);

                    await ctx.scheduler.runAfter(0, api.multiplayer.makeMove, { // Run immediately
                        lobbyId: args.lobbyId,
                        playerName: botName,
                        action: "play_card",
                        selectedCardId: cardToPlay,
                        // TODO: Add bot booster logic
                    });
                } else {
                    console.error(`[checkBotMoves] Bot ${botName} in lobby ${args.lobbyId} has no cards to play!`);
                    // What should happen here? Mark player as skipped? Forfeit? Error state?
                    // For now, log error and the bot turn might get stuck.
                }
            } else {
                console.log(`[checkBotMoves] Bot ${botName} has nothing to do in phase ${lobby.gamePhase}.`);
            }
        } catch (error: any) { // Catch potential errors during bot's makeMove call
            console.error(`[checkBotMoves] Error during bot move for ${botName} in lobby ${args.lobbyId}:`, error);
            // Optional: Try to recover or mark lobby as error state?
        }

        // If it's a bot's turn, make a move for them
        if (lobby.currentPlayer && lobby.currentPlayer.startsWith("Bot_")) {
            const botName = lobby.currentPlayer;
            console.log(`[checkBotMoves] Triggered for bot ${botName} in lobby ${args.lobbyId}, phase: ${lobby.gamePhase}`);

            // Define the stats bots can choose from
            const availableStats = ['Batting_Average', 'Runs_Scored', 'Wickets_Taken', 'Economy_Rate', 'Batting_Strike_Rate'];
            const playerHands = lobby.playerHands as PlayerHandsMap;
            const botHand = playerHands?.[botName];

            if (lobby.gamePhase === "stat_selection") {
                if (botHand && botHand.length > 0) {
                    // Bot starts the hand: Select the first stat and play the first card
                    const statToSelect = availableStats[0]; // Always select the first stat
                    const cardToPlay = botHand[0]; // Always play the first card
                    console.log(`[checkBotMoves] Bot ${botName} starting hand, selecting stat: ${statToSelect} with card: ${cardToPlay}`);

                    await ctx.scheduler.runAfter(0, api.multiplayer.makeMove, {
                        lobbyId: args.lobbyId,
                        playerName: botName,
                        action: "select_stat",
                        selectedStat: statToSelect,
                        selectedCardId: cardToPlay, // Pass the card ID here
                    });
                } else {
                    console.error(`[checkBotMoves] Bot ${botName} in lobby ${args.lobbyId} has no cards to select a stat with!`);
                    // Handle error: Bot might get stuck
                }
            } else if (lobby.gamePhase === "card_selection") {
                if (botHand && botHand.length > 0) {
                    // Bot responds to a stat: Select a random card from the bot's hand
                    const randomIndex = Math.floor(Math.random() * botHand.length);
                    const cardToPlay = botHand[randomIndex];
                    console.log(`[checkBotMoves] Bot ${botName} randomly playing card: ${cardToPlay} for stat: ${lobby.currentHand?.statSelector}`);

                    await ctx.scheduler.runAfter(0, api.multiplayer.makeMove, { // Run immediately
                        lobbyId: args.lobbyId,
                        playerName: botName,
                        action: "play_card",
                        selectedCardId: cardToPlay,
                        // TODO: Add bot booster logic
                    });
                } else {
                    console.error(`[checkBotMoves] Bot ${botName} in lobby ${args.lobbyId} has no cards to play!`);
                    // Handle error: Bot might get stuck
                }
            } else {
                console.log(`[checkBotMoves] Bot ${botName} turn, but game phase is ${lobby.gamePhase}. No bot action defined.`);
            }
        } else {
            console.log("[checkBotMoves] Not a bot's turn or no current player.");
        }

        return true; // Indicate check completed
    } // Closing brace for the handler function
});

export const findOrJoinPvPLobby = mutation({
  args: { playerName: v.string() },
  handler: async (ctx, args) => {
    // First clean up old/zombie lobbies - older than 1 hour
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const oldLobbies = await ctx.db.query("game_lobbies")
      .filter(q => q.lt(q.field("lastMoveTime"), oneHourAgo))
      .collect();
    
    for (const oldLobby of oldLobbies) {
      // Handle undefined lastMoveTime safely
      const timestamp = oldLobby.lastMoveTime || Date.now();
      console.log(`Cleaning up old lobby ${oldLobby.lobbyId} from ${new Date(timestamp).toISOString()}`);
      await ctx.db.delete(oldLobby._id);
    }

    // Check if player is already in a PvP lobby
    const lobbiesResult = await ctx.db.query("game_lobbies")
      .filter(q => q.eq(q.field("isArenaMode"), true))
      .filter(q => q.eq(q.field("status"), "waiting"))
      .collect();
      
    // Now filter for player's existing lobbies
    const existingPlayerLobbies = lobbiesResult.filter(lobby => 
      Array.isArray(lobby.players) && lobby.players.includes(args.playerName)
    );
      
    if (existingPlayerLobbies.length > 0) {
      // Player is already in a lobby - return that one
      return { 
        lobbyId: existingPlayerLobbies[0].lobbyId, 
        id: existingPlayerLobbies[0]._id 
      };
    }
    
    // Search for a waiting PvP lobby with space
    const allWaitingLobbies = await ctx.db.query("game_lobbies")
      .filter(q => q.eq(q.field("isArenaMode"), true))
      .filter(q => q.eq(q.field("status"), "waiting"))
      .collect();
      
    // Find lobbies with space and sort by most players first
    const availableLobbies = allWaitingLobbies
      .filter(lobby => Array.isArray(lobby.players) && lobby.players.length < 4)
      .sort((a, b) => (b.players?.length || 0) - (a.players?.length || 0));
      
    // Join any available lobby that isn't full
    if (availableLobbies.length > 0) {
      const lobby = availableLobbies[0];
      const updatedPlayers = [...lobby.players, args.playerName];
      const playerScores = { ...(lobby.playerScores ?? {}), [args.playerName]: 0 };
      const playerBoosters = { ...(lobby.playerBoosters ?? {}), [args.playerName]: { orange: true, purple: true, teamrank: true } };
      
      await ctx.db.patch(lobby._id, { 
        players: updatedPlayers, 
        playerScores, 
        playerBoosters, 
        lastMoveTime: Date.now() 
      });
      
      return { lobbyId: lobby.lobbyId, id: lobby._id };
    }
    
    // Create new PvP lobby if none available
    const newId = await ctx.db.insert("game_lobbies", {
      lobbyId: Math.random().toString(36).substring(2, 7).toUpperCase(),
      isArenaMode: true,
      players: [args.playerName],
      hostPlayerName: args.playerName,
      status: "waiting",
      gameStarted: false,
      createdAt: Date.now(),
      lastMoveTime: Date.now(),
      currentPlayer: undefined,
      gamePhase: undefined,
      playerHands: undefined,
      selectedStat: undefined,
      currentHand: undefined,
      completedHands: [],
      playerScores: { [args.playerName]: 0 },
      playerBoosters: { [args.playerName]: { orange: true, purple: true, teamrank: true } },
      orangeCapPlayer: undefined,
      purpleCapPlayer: undefined,
      teamRankings: undefined,
    });
    
    const doc = await ctx.db.get(newId);
    return { lobbyId: doc!.lobbyId, id: newId };
  }
});

export const clearGameLobbies = mutation({
  args: {},
  handler: async (ctx) => {
    const lobbies = await ctx.db.query("game_lobbies").collect();
    for (const lobby of lobbies) {
      await ctx.db.delete(lobby._id);
    }
    console.log(`Cleared ${lobbies.length} game_lobbies`);
    return { cleared: lobbies.length };
  }
});

// Helper function to check if a lobby is expired
const isLobbyExpired = (lobby: any): boolean => {
  if (!lobby) return true;
  
  const FIVE_MINUTES = 5 * 60 * 1000;
  const lastActivity = lobby.lastMoveTime || lobby.createdAt;
  
  // All lobbies expire after 5 minutes of inactivity
  return Date.now() > lastActivity + FIVE_MINUTES;
};