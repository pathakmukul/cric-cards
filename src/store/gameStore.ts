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
  boosterUsed?: 'orange' | 'purple' | 'teamrank';
  finalValue?: number;
}

interface Hand {
  initiator: string;
  selectedStat: string;
  playedCards: PlayedCard[];
  winner?: string;
}

interface GameState {
  players: string[];
  currentPlayer: number;
  selectedStat: string | null;
  selectedCard: PlayerCard | null;
  currentHand: Hand | null;
  completedHands: Hand[];
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
  
  // Actions
  setPlayers: (players: string[]) => void;
  nextPlayer: () => void;
  selectStat: (stat: string) => void;
  selectCard: (card: PlayerCard) => void;
  playCard: (playerId: string, card: PlayerCard, booster?: 'orange' | 'purple' | 'teamrank') => void;
  dealCards: (cards: PlayerCard[]) => void;
  resolveHand: () => void;
  startNewHand: () => void;
  setGameData: (
    orangeCap: string, 
    purpleCap: string, 
    teamRankings: { [team: string]: number }
  ) => void;
  resetGame: () => void;
}

// Helper function to calculate the value of a stat with boosters applied
const calculateStatValue = (
  card: PlayerCard, 
  stat: string, 
  booster: 'orange' | 'purple' | 'teamrank' | undefined,
  orangeCapPlayer: string | null,
  purpleCapPlayer: string | null,
  teamRankings: { [team: string]: number }
): number => {
  // Convert string stats to numbers if needed
  let baseValue = typeof card.stats[stat] === 'string' 
    ? parseFloat(card.stats[stat] as string) || 0 
    : card.stats[stat] as number;
  
  let multiplier = 1;
  
  // Apply orange cap booster (batting stats)
  if (booster === 'orange' || 
      (orangeCapPlayer === card.Player_Name && 
       ['Batting_Average', 'Batting_Strike_Rate', 'Runs_Scored', 'Centuries', 'Half_Centuries', 'Sixes', 'Fours'].includes(stat))) {
    multiplier *= 1.2;
  }
  
  // Apply purple cap booster (bowling stats)
  if (booster === 'purple' || 
      (purpleCapPlayer === card.Player_Name && 
       ['Bowling_Average', 'Bowling_Strike_Rate', 'Economy_Rate', 'Wickets_Taken', 'Four_Wicket_Hauls', 'Five_Wicket_Hauls'].includes(stat))) {
    multiplier *= 1.2;
  }
  
  // Apply team rank booster
  if (booster === 'teamrank' && card.team && teamRankings[card.team]) {
    const rank = teamRankings[card.team];
    if (rank === 1) multiplier *= 1.4;
    else if (rank === 2) multiplier *= 1.3;
    else if (rank === 3) multiplier *= 1.2;
    else if (rank === 4) multiplier *= 1.1;
  }
  
  return baseValue * multiplier;
};

export const useGameStore = create<GameState>((set) => ({
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
  
  setPlayers: (players) => set({ 
    players,
    playerScores: players.reduce((acc, player) => ({ ...acc, [player]: 0 }), {}),
    playerBoosters: players.reduce((acc, player) => ({ 
      ...acc, 
      [player]: { orange: true, purple: true, teamrank: true } 
    }), {}),
  }),
  
  nextPlayer: () => set((state) => ({
    currentPlayer: (state.currentPlayer + 1) % state.players.length
  })),
  
  selectStat: (stat) => set((state) => ({
    selectedStat: stat,
    gamePhase: state.gamePhase === 'stat_selection' ? 'card_selection' : state.gamePhase
  })),
  
  selectCard: (card) => set({
    selectedCard: card
  }),
  
  playCard: (playerId, card, booster) => set((state) => {
    // If this is the first card played in a hand, create a new hand
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
        gamePhase: 'card_selection'
      };
    }
    
    // Add card to the current hand
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
    
    // Remove the card from the player's hand
    const updatedPlayerHands = {
      ...state.playerHands,
      [playerId]: state.playerHands[playerId].filter(c => c.id !== card.id)
    };
    
    // If all players have played a card, move to resolution phase
    const allPlayersPlayed = state.players.every(player => 
      updatedHand.playedCards.some(pc => pc.playerId === player)
    );
    
    return {
      currentHand: updatedHand,
      playerHands: updatedPlayerHands,
      selectedCard: null,
      gamePhase: allPlayersPlayed ? 'resolution' : 'card_selection'
    };
  }),
  
  resolveHand: () => set((state) => {
    if (!state.currentHand) return state;
    
    // Determine the winner of the hand
    const { selectedStat, playedCards } = state.currentHand;
    
    // For bowling stats like Economy_Rate, Bowling_Average, lower is better
    const isLowerBetter = ['Economy_Rate', 'Bowling_Average', 'Bowling_Strike_Rate'].includes(selectedStat);
    
    let winningCard = playedCards[0];
    for (let i = 1; i < playedCards.length; i++) {
      const currentValue = playedCards[i].finalValue || 0;
      const winningValue = winningCard.finalValue || 0;
      
      if (isLowerBetter ? currentValue < winningValue : currentValue > winningValue) {
        winningCard = playedCards[i];
      }
    }
    
    // Update the hand with the winner
    const completedHand = {
      ...state.currentHand,
      winner: winningCard.playerId
    };
    
    // Update player scores
    const updatedScores = { ...state.playerScores };
    updatedScores[winningCard.playerId] = (updatedScores[winningCard.playerId] || 0) + 1;
    
    // Check if the game is over (all cards played)
    const isGameOver = Object.values(state.playerHands).every(hand => hand.length === 0);
    
    return {
      currentHand: null,
      completedHands: [...state.completedHands, completedHand],
      playerScores: updatedScores,
      gamePhase: isGameOver ? 'game_over' : 'stat_selection',
      currentPlayer: isGameOver ? state.currentPlayer : state.players.indexOf(winningCard.playerId)
    };
  }),
  
  startNewHand: () => set({
    selectedStat: null,
    selectedCard: null,
    gamePhase: 'stat_selection'
  }),
  
  dealCards: (cards) => {
    const playerHands: { [key: string]: PlayerCard[] } = {};
    const players = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];
    
    players.forEach((player, index) => {
      playerHands[player] = cards.slice(index * 5, (index + 1) * 5);
    });
    
    set({ 
      playerHands,
      gamePhase: 'stat_selection',
      currentPlayer: 0,
      selectedStat: null,
      selectedCard: null,
      currentHand: null,
      completedHands: []
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
    gamePhase: 'waiting'
  }))
}));