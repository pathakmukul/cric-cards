import { create } from 'zustand';

interface PlayerCard {
  id: string;
  Player_Name: string;
  team: string;
  stats: {
    [key: string]: number | string;
  };
}

interface PlayedCard {
  playerId: string;
  card: PlayerCard;
  boosterUsed?: 'orange' | 'purple' | 'teamrank' | null;
  finalValue?: number;
}

export interface CurrentHand {
  initiator: string;
  selectedStat: string;
  playedCards: {
    playerId: string;
    card: PlayerCard;
    boosterUsed?: 'orange' | 'purple' | 'teamrank' | null;
    finalValue?: number;
  }[];
  winner?: string;
  leadingCard?: {
    playerId: string;
    finalValue: number;
  };
}

interface GameState {
  players: string[];
  currentPlayer: number;
  selectedStat: string | null;
  selectedCard: PlayerCard | null;
  currentHand: CurrentHand | null;
  completedHands: CurrentHand[];
  playerHands: { [key: string]: PlayerCard[] };
  playerScores: { [key: string]: number };
  playerBoosters: { 
    [playerId: string]: {
      orange: boolean;
      purple: boolean;
      teamrank: boolean;
    }
  };
  gamePhase: 'waiting' | 'stat_selection' | 'card_selection' | 'resolution' | 'game_over';
  orangeCapPlayer: string | null;
  purpleCapPlayer: string | null;
  teamRankings: { [team: string]: number };
  activeBooster: 'orange' | 'purple' | 'teamrank' | null;
  lastWinner: { playerId: string; value: number; stat: string } | null;
  
  // Actions
  setPlayers: (players: string[]) => void;
  nextPlayer: () => void;
  selectStat: (stat: string) => void;
  selectCard: (card: PlayerCard) => void;
  playCard: (playerId: string, card: PlayerCard, booster?: 'orange' | 'purple' | 'teamrank') => void;
  playCardWithStat: (playerId: string, card: PlayerCard, stat: string) => void;
  dealCards: (cards: PlayerCard[]) => void;
  resolveHand: () => void;
  startNewHand: () => void;
  setGameData: (orangeCap: string, purpleCap: string, teamRankings: { [team: string]: number }) => void;
  resetGame: () => void;
  setActiveBooster: (booster: 'orange' | 'purple' | 'teamrank' | null) => void;
  resetSelectionState: () => void;
}

const calculateStatValue = (
  card: PlayerCard, 
  stat: string, 
  booster: 'orange' | 'purple' | 'teamrank' | null | undefined,
  orangeCapPlayer: string | null,
  purpleCapPlayer: string | null,
  teamRankings: { [team: string]: number }
): number => {
  let baseValue = typeof card.stats[stat] === 'string' 
    ? parseFloat(card.stats[stat] as string) || 0 
    : card.stats[stat] as number;
  
  let multiplier = 1;
  
  if (booster === 'orange' || 
      (orangeCapPlayer === card.Player_Name && 
       ['Batting_Average', 'Batting_Strike_Rate', 'Runs_Scored', 'Centuries', 'Half_Centuries', 'Sixes', 'Fours'].includes(stat))) {
    multiplier *= 1.2;
  }
  
  if (booster === 'purple' || 
      (purpleCapPlayer === card.Player_Name && 
       ['Bowling_Average', 'Bowling_Strike_Rate', 'Economy_Rate', 'Wickets_Taken', 'Four_Wicket_Hauls', 'Five_Wicket_Hauls'].includes(stat))) {
    multiplier *= 1.2;
  }
  
  if (booster === 'teamrank' && card.team && teamRankings[card.team]) {
    const rank = teamRankings[card.team];
    if (rank === 1) multiplier *= 1.4;
    else if (rank === 2) multiplier *= 1.3;
    else if (rank === 3) multiplier *= 1.2;
    else if (rank === 4) multiplier *= 1.1;
  }
  
  return baseValue * multiplier;
};

export const useGameStore = create<GameState>((set, get) => ({
  players: ['Player 1', 'Player 2', 'Player 3', 'Player 4'],
  currentPlayer: 0,
  selectedStat: null,
  selectedCard: null,
  currentHand: null,
  completedHands: [],
  playerHands: {},
  playerScores: { 'Player 1': 0, 'Player 2': 0, 'Player 3': 0, 'Player 4': 0 },
  playerBoosters: {
    'Player 1': { orange: true, purple: true, teamrank: true },
    'Player 2': { orange: true, purple: true, teamrank: true },
    'Player 3': { orange: true, purple: true, teamrank: true },
    'Player 4': { orange: true, purple: true, teamrank: true },
  },
  gamePhase: 'waiting',
  orangeCapPlayer: null,
  purpleCapPlayer: null,
  teamRankings: {},
  activeBooster: null,
  lastWinner: null,
  
  setPlayers: (players) => set({ 
    players,
    playerScores: players.reduce((acc, player) => ({ ...acc, [player]: 0 }), {}),
    playerBoosters: players.reduce((acc, player) => ({ 
      ...acc, 
      [player]: { orange: true, purple: true, teamrank: true } 
    }), {}),
  }),
  
  nextPlayer: () => set((state) => ({
    currentPlayer: (state.currentPlayer + 1) % state.players.length,
    activeBooster: null
  })),
  
  selectStat: (stat) => {
    const state = get();
    
    // If we're in card selection phase and a card is already selected,
    // play the card with this stat immediately
    if (state.gamePhase === 'card_selection' && state.selectedCard) {
      const playerId = state.players[state.currentPlayer];
      get().playCardWithStat(playerId, state.selectedCard, stat);
      return;
    }
    
    // For the first hand or in stat_selection phase,
    // automatically select the best card for this stat and play it immediately
    if (state.gamePhase === 'stat_selection') {
      const playerId = state.players[state.currentPlayer];
      const playerHand = state.playerHands[playerId] || [];
      
      if (playerHand.length > 0) {
        // Find best card for this stat
        const isLowerBetter = ['Economy_Rate', 'Bowling_Average', 'Bowling_Strike_Rate'].includes(stat);
        
        // Sort cards by stat value, either highest first (most stats) or lowest first (economy, bowling avg, etc)
        const sortedCards = [...playerHand].sort((a, b) => {
          const valueA = typeof a.stats[stat] === 'string' 
            ? parseFloat(a.stats[stat] as string) || 0 
            : a.stats[stat] as number || 0;
          
          const valueB = typeof b.stats[stat] === 'string'
            ? parseFloat(b.stats[stat] as string) || 0 
            : b.stats[stat] as number || 0;
          
          return isLowerBetter ? valueA - valueB : valueB - valueA;
        });
        
        // Play the best card immediately
        const bestCard = sortedCards[0];
        
        // Set the stat and immediately play the card
        set({ selectedStat: stat });
        get().playCardWithStat(playerId, bestCard, stat);
        return;
      }
    }
    
    // Otherwise just select the stat normally (fallback for edge cases)
    set((state) => ({
      selectedStat: stat,
      gamePhase: state.gamePhase === 'stat_selection' ? 'card_selection' : state.gamePhase
    }));
  },
  
  selectCard: (card) => {
    const state = get();
    
    // If a stat is already selected, play the card with that stat immediately
    if (state.selectedStat) {
      const playerId = state.players[state.currentPlayer];
      get().playCardWithStat(playerId, card, state.selectedStat);
      return;
    }
    
    // Otherwise, just select the card normally
    set({
      selectedCard: card
    });
  },
  
  setActiveBooster: (booster) => set((state) => {
    const currentPlayerName = state.players[state.currentPlayer];
    const playerBoostersAvailable = state.playerBoosters[currentPlayerName];
    
    if (booster && (!playerBoostersAvailable || !playerBoostersAvailable[booster])) {
      return state;
    }
    
    return { activeBooster: booster };
  }),
  
  playCardWithStat: (playerId, card, stat) => {
    const state = get();
    const { activeBooster } = state;
    
    // Only allow playing if it's the current player's turn
    if (state.players[state.currentPlayer] !== playerId) {
      console.warn("Not your turn!");
      return;
    }
    
    // Make sure we don't duplicate cards
    if (state.currentHand && state.currentHand.playedCards.some(pc => pc.card.id === card.id)) {
      console.warn("Card already played!");
      return;
    }
    
    if (!state.currentHand) {
      const finalValue = calculateStatValue(
        card,
        stat,
        activeBooster,
        state.orangeCapPlayer,
        state.purpleCapPlayer,
        state.teamRankings
      );
      
      set((state) => ({
        currentHand: {
          initiator: playerId,
          selectedStat: stat,
          playedCards: [{
            playerId,
            card,
            boosterUsed: activeBooster,
            finalValue
          }],
          leadingCard: {
            playerId,
            finalValue
          }
        },
        playerHands: {
          ...state.playerHands,
          [playerId]: state.playerHands[playerId].filter(c => c.id !== card.id)
        },
        playerBoosters: activeBooster ? {
          ...state.playerBoosters,
          [playerId]: {
            ...state.playerBoosters[playerId],
            [activeBooster]: false
          }
        } : state.playerBoosters,
        selectedCard: null,
        selectedStat: stat,
        gamePhase: 'card_selection',
        activeBooster: null,
        currentPlayer: (state.currentPlayer + 1) % state.players.length
      }));
    } else {
      set((state) => {
        const updatedHand = { ...state.currentHand! };
        
        // Prevent duplicate card plays
        if (updatedHand.playedCards.some(pc => pc.playerId === playerId)) {
          console.warn("Player already played a card in this hand!");
          return state;
        }
        
        const finalValue = calculateStatValue(
          card,
          state.currentHand!.selectedStat,
          activeBooster,
          state.orangeCapPlayer,
          state.purpleCapPlayer,
          state.teamRankings
        );
        
        updatedHand.playedCards.push({
          playerId,
          card,
          boosterUsed: activeBooster,
          finalValue
        });

        // Determine the leading card
        const isLowerBetter = ['Economy_Rate', 'Bowling_Average', 'Bowling_Strike_Rate'].includes(updatedHand.selectedStat);
        
        let leadingCard = updatedHand.leadingCard;
        if (!leadingCard || (isLowerBetter ? finalValue < leadingCard.finalValue : finalValue > leadingCard.finalValue)) {
          leadingCard = {
            playerId,
            finalValue
          };
        }
        
        updatedHand.leadingCard = leadingCard;

        const allPlayersPlayed = state.players.every(player =>
          updatedHand.playedCards.some(pc => pc.playerId === player)
        );

        return {
          currentHand: updatedHand,
          playerHands: {
            ...state.playerHands,
            [playerId]: state.playerHands[playerId].filter(c => c.id !== card.id)
          },
          playerBoosters: activeBooster ? {
            ...state.playerBoosters,
            [playerId]: {
              ...state.playerBoosters[playerId],
              [activeBooster]: false
            }
          } : state.playerBoosters,
          selectedCard: null,
          activeBooster: null,
          gamePhase: allPlayersPlayed ? 'resolution' : 'card_selection',
          currentPlayer: allPlayersPlayed ? state.currentPlayer : (state.currentPlayer + 1) % state.players.length
        };
      });
    }
  },
  
  playCard: (playerId, card, booster) => set((state) => {
    if (!state.currentHand) {
      return {
        currentHand: {
          initiator: playerId,
          selectedStat: state.selectedStat || '',
          playedCards: [{
            playerId,
            card,
            boosterUsed: booster,
            finalValue: calculateStatValue(
              card,
              state.selectedStat || '',
              booster,
              state.orangeCapPlayer,
              state.purpleCapPlayer,
              state.teamRankings
            )
          }]
        },
        playerHands: {
          ...state.playerHands,
          [playerId]: state.playerHands[playerId].filter(c => c.id !== card.id)
        },
        selectedCard: null,
        gamePhase: 'card_selection',
        currentPlayer: (state.currentPlayer + 1) % state.players.length
      };
    }
    
    const updatedHand = { ...state.currentHand };
    updatedHand.playedCards.push({
      playerId,
      card,
      boosterUsed: booster,
      finalValue: calculateStatValue(
        card,
        state.currentHand.selectedStat,
        booster,
        state.orangeCapPlayer,
        state.purpleCapPlayer,
        state.teamRankings
      )
    });
    
    const updatedPlayerHands = {
      ...state.playerHands,
      [playerId]: state.playerHands[playerId].filter(c => c.id !== card.id)
    };
    
    const allPlayersPlayed = state.players.every(player => 
      updatedHand.playedCards.some(pc => pc.playerId === player)
    );
    
    return {
      currentHand: updatedHand,
      playerHands: updatedPlayerHands,
      selectedCard: null,
      gamePhase: allPlayersPlayed ? 'resolution' : 'card_selection',
      currentPlayer: allPlayersPlayed ? state.currentPlayer : (state.currentPlayer + 1) % state.players.length
    };
  }),
  
  resolveHand: () => set((state) => {
    if (!state.currentHand) return state;
    
    const { selectedStat, playedCards } = state.currentHand;
    const isLowerBetter = ['Economy_Rate', 'Bowling_Average', 'Bowling_Strike_Rate'].includes(selectedStat);
    
    let winningCard = playedCards[0];
    for (let i = 1; i < playedCards.length; i++) {
      const currentValue = playedCards[i].finalValue || 0;
      const winningValue = winningCard.finalValue || 0;
      
      if (isLowerBetter ? currentValue < winningValue : currentValue > winningValue) {
        winningCard = playedCards[i];
      }
    }
    
    const completedHand = {
      ...state.currentHand,
      winner: winningCard.playerId
    };
    
    const updatedScores = { ...state.playerScores };
    updatedScores[winningCard.playerId] = (updatedScores[winningCard.playerId] || 0) + 1;
    
    // Change end condition to be based on completing 5 rounds
    const updatedCompletedHands = [...state.completedHands, completedHand];
    const isGameOver = updatedCompletedHands.length >= 5;
    
    // Ensure every player has at least one card remaining for the final round
    // This fixes the case when a player might have lost cards due to timing issues
    let updatedPlayerHands = { ...state.playerHands };
    
    if (updatedCompletedHands.length === 4) {  // Before the final (5th) round
      // Check if any player has no cards, and give them one if needed
      state.players.forEach(player => {
        if (!updatedPlayerHands[player] || updatedPlayerHands[player].length === 0) {
          console.warn(`Player ${player} has no cards left before final round. Generating a card.`);
          
          // Find a card this player has played before to duplicate
          const playedCardByPlayer = state.completedHands
            .flatMap(hand => hand.playedCards)
            .find(pc => pc.playerId === player);
          
          if (playedCardByPlayer) {
            const duplicateCard = {
              ...playedCardByPlayer.card,
              id: `${playedCardByPlayer.card.id}-emergency-${Date.now()}`
            };
            
            updatedPlayerHands = {
              ...updatedPlayerHands,
              [player]: updatedPlayerHands[player] ? [...updatedPlayerHands[player], duplicateCard] : [duplicateCard]
            };
          }
        }
      });
    }
    
    return {
      currentHand: null,
      completedHands: updatedCompletedHands,
      playerHands: updatedPlayerHands,
      playerScores: updatedScores,
      gamePhase: isGameOver ? 'game_over' : 'stat_selection',
      currentPlayer: isGameOver ? state.currentPlayer : state.players.indexOf(winningCard.playerId),
      lastWinner: {
        playerId: winningCard.playerId,
        value: winningCard.finalValue || 0,
        stat: selectedStat
      },
      selectedStat: null,
      selectedCard: null,
      activeBooster: null
    };
  }),
  
  startNewHand: () => set((state) => ({
    selectedStat: null,
    selectedCard: null,
    gamePhase: state.gamePhase === 'game_over' ? 'game_over' : 'stat_selection',
    activeBooster: null,
    lastWinner: null,
    currentHand: null
  })),
  
  dealCards: (cards) => {
    const playerHands: { [key: string]: PlayerCard[] } = {};
    const players = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];
    
    // Make sure each player gets at least 5 cards for 5 rounds
    players.forEach((player, index) => {
      // If we don't have enough cards, duplicate some to ensure we have 5 per player
      const startIndex = index * 5;
      const availableCards = cards.slice(startIndex, startIndex + 5);
      
      // If we don't have 5 cards, duplicate some to reach 5
      const playerCards = [...availableCards];
      while (playerCards.length < 5) {
        const randomCard = availableCards[Math.floor(Math.random() * availableCards.length)];
        if (randomCard) {
          // Create a copy with a unique ID to avoid duplicate keys
          playerCards.push({
            ...randomCard,
            id: `${randomCard.id}-copy-${playerCards.length}`
          });
        }
      }
      
      playerHands[player] = playerCards;
    });
    
    set({ 
      playerHands,
      gamePhase: 'stat_selection',
      currentPlayer: 0,
      selectedStat: null,
      selectedCard: null,
      currentHand: null,
      completedHands: [],
      lastWinner: null
    });
  },
  
  setGameData: (orangeCap, purpleCap, teamRankings) => set({
    orangeCapPlayer: orangeCap,
    purpleCapPlayer: purpleCap,
    teamRankings
  }),
  
  resetGame: () => set((state) => ({
    currentPlayer: 0,
    selectedStat: null,
    selectedCard: null,
    currentHand: null,
    completedHands: [],
    playerScores: state.players.reduce((acc, player) => ({ ...acc, [player]: 0 }), {}),
    playerBoosters: state.players.reduce((acc, player) => ({ 
      ...acc, 
      [player]: { orange: true, purple: true, teamrank: true } 
    }), {}),
    gamePhase: 'waiting',
    activeBooster: null,
    lastWinner: null
  })),
  
  resetSelectionState: () => {
    set({
      selectedCard: null,
      selectedStat: null,
      gamePhase: 'stat_selection'
    });
  }
}));