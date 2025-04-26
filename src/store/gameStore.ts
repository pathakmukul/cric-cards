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
  triggerBotMove: (playerId: string) => void;
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

const BOT_PLAYERS = ["Bot 1", "Bot 2", "Bot 3"];
const HUMAN_PLAYER = "You";
const SINGLE_PLAYER_NAMES = [HUMAN_PLAYER, ...BOT_PLAYERS];

export const useGameStore = create<GameState>((set, get) => ({
  players: [...SINGLE_PLAYER_NAMES],
  currentPlayer: 0,
  selectedStat: null,
  selectedCard: null,
  currentHand: null,
  completedHands: [],
  playerHands: {},
  playerScores: SINGLE_PLAYER_NAMES.reduce((acc, player) => ({ ...acc, [player]: 0 }), {}),
  playerBoosters: SINGLE_PLAYER_NAMES.reduce((acc, player) => ({
    ...acc, 
    [player]: { orange: true, purple: true, teamrank: true } 
  }), {}),
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
    const currentPlayerName = state.players[state.currentPlayer];
    
    if (currentPlayerName.startsWith("Bot ")) return;

    if (state.gamePhase === 'card_selection' && state.selectedCard) {
      get().playCardWithStat(currentPlayerName, state.selectedCard, stat);
      return;
    }
    
    if (state.gamePhase === 'stat_selection') {
      const playerHand = state.playerHands[currentPlayerName] || [];
      
      if (playerHand.length > 0) {
        const isLowerBetter = ['Economy_Rate', 'Bowling_Average', 'Bowling_Strike_Rate'].includes(stat);
        
        const sortedCards = [...playerHand].sort((a, b) => {
          const valueA = typeof a.stats[stat] === 'string' ? parseFloat(a.stats[stat] as string) || 0 : a.stats[stat] as number || 0;
          const valueB = typeof b.stats[stat] === 'string' ? parseFloat(b.stats[stat] as string) || 0 : b.stats[stat] as number || 0;
          return isLowerBetter ? valueA - valueB : valueB - valueA;
        });
        
        const bestCard = sortedCards[0];
        set({ selectedStat: stat });
        get().playCardWithStat(currentPlayerName, bestCard, stat);
        return;
      }
    }
    
    set((state) => ({
      selectedStat: stat,
      gamePhase: state.gamePhase === 'stat_selection' ? 'card_selection' : state.gamePhase
    }));
  },
  
  selectCard: (card) => {
    const state = get();
    const currentPlayerName = state.players[state.currentPlayer];
    
    if (currentPlayerName.startsWith("Bot ")) return;

    if (state.selectedStat) {
      get().playCardWithStat(currentPlayerName, card, state.selectedStat);
      return;
    }
    
    set({ selectedCard: card });
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

    if (state.players[state.currentPlayer] !== playerId) {
      console.warn(`Attempted to play for ${playerId} but it's ${state.players[state.currentPlayer]}'s turn.`);
      return;
    }

    const playerHand = state.playerHands[playerId];
    if (!playerHand || !playerHand.some(c => c.id === card.id)) {
      console.error(`Player ${playerId} does not have card ${card.id}. Hand:`, playerHand);
      return; 
    }

    if (state.currentHand && state.currentHand.playedCards.some(pc => pc.playerId === playerId)) {
      console.warn(`Player ${playerId} already played a card in this hand!`);
      return;
    }

    const currentSelectedStat = state.currentHand ? state.currentHand.selectedStat : stat;
    const boosterToUse = playerId.startsWith("Bot ") ? null : activeBooster;

    const finalValue = calculateStatValue(
      card,
      currentSelectedStat,
      boosterToUse,
      state.orangeCapPlayer,
      state.purpleCapPlayer,
      state.teamRankings
    );

    set((currentState) => {
      let updatedHand: CurrentHand;
      const newPlayedCard = {
        playerId,
        card,
        boosterUsed: boosterToUse,
        finalValue
      };

      if (!currentState.currentHand) {
        updatedHand = {
          initiator: playerId,
          selectedStat: currentSelectedStat,
          playedCards: [newPlayedCard],
          leadingCard: {
            playerId,
            finalValue
          }
        };
      } else {
        updatedHand = { ...currentState.currentHand };
        updatedHand.playedCards.push(newPlayedCard);

        const isLowerBetter = ['Economy_Rate', 'Bowling_Average', 'Bowling_Strike_Rate'].includes(updatedHand.selectedStat);
        let leadingCard = updatedHand.leadingCard;
        if (!leadingCard || (isLowerBetter ? finalValue < leadingCard.finalValue : finalValue > leadingCard.finalValue)) {
          leadingCard = { playerId, finalValue };
        }
        updatedHand.leadingCard = leadingCard;
      }

      const allPlayersPlayed = currentState.players.every(player =>
        updatedHand.playedCards.some(pc => pc.playerId === player)
      );

      return {
        currentHand: updatedHand,
        playerHands: {
          ...currentState.playerHands,
          [playerId]: currentState.playerHands[playerId].filter(c => c.id !== card.id)
        },
        playerBoosters: boosterToUse ? {
          ...currentState.playerBoosters,
          [playerId]: {
            ...currentState.playerBoosters[playerId],
            [boosterToUse]: false
          }
        } : currentState.playerBoosters,
        selectedCard: null,
        selectedStat: currentSelectedStat,
        activeBooster: null,
        gamePhase: allPlayersPlayed ? 'resolution' : 'card_selection',
        currentPlayer: allPlayersPlayed ? currentState.currentPlayer : (currentState.currentPlayer + 1) % currentState.players.length
      };
    });
  },
  
  playCard: (playerId, card, booster) => {
     console.warn("playCard action called - prefer playCardWithStat");
     const state = get();
     if (!state.selectedStat) {
       console.error("Cannot play card without a selected stat.");
       return;
     }
     get().playCardWithStat(playerId, card, state.selectedStat);
  },
  
  resolveHand: () => set((state) => {
    if (!state.currentHand || state.gamePhase !== 'resolution') return state;
    
    const { selectedStat, playedCards } = state.currentHand;
    if (playedCards.length !== state.players.length) {
        console.warn("Trying to resolve hand before all players played.");
        return state;
    }

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
    
    const updatedCompletedHands = [...state.completedHands, completedHand];
    const isGameOver = updatedCompletedHands.length >= 5 || 
                       state.players.some(p => !state.playerHands[p] || state.playerHands[p].length === 0);

    
    return {
      currentHand: null,
      completedHands: updatedCompletedHands,
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
    const players = [...SINGLE_PLAYER_NAMES];
    const cardsPerPlayer = 5;

    let allCardsForDealing = [...cards];
    while (allCardsForDealing.length < players.length * cardsPerPlayer) {
        console.warn(`Not enough unique cards (${allCardsForDealing.length}) for ${players.length} players. Duplicating...`);
        const cardToDuplicate = cards[Math.floor(Math.random() * cards.length)];
        if (cardToDuplicate) {
            allCardsForDealing.push({
                ...cardToDuplicate,
                id: `${cardToDuplicate.id}-dup-${Date.now()}-${Math.random()}`
            });
        } else {
            console.error("Cannot duplicate card, initial card array seems empty.");
            break; 
        }
    }

    const shuffledCards = [...allCardsForDealing].sort(() => Math.random() - 0.5);

    players.forEach((player, index) => {
      const startIndex = index * cardsPerPlayer;
      playerHands[player] = shuffledCards.slice(startIndex, startIndex + cardsPerPlayer);
    });
    
    set({ 
      players: players,
      playerHands,
      gamePhase: 'stat_selection',
      currentPlayer: 0,
      selectedStat: null,
      selectedCard: null,
      currentHand: null,
      completedHands: [],
      lastWinner: null,
      playerScores: players.reduce((acc, player) => ({ ...acc, [player]: 0 }), {}),
      playerBoosters: players.reduce((acc, player) => ({ 
        ...acc, 
        [player]: { orange: true, purple: true, teamrank: true } 
      }), {}),
    });
  },
  
  setGameData: (orangeCap: string | null, purpleCap: string | null, teamRankings: { [team: string]: number }) => set({
    orangeCapPlayer: orangeCap,
    purpleCapPlayer: purpleCap,
    teamRankings,
  }),
  
  resetGame: () => set((state) => {
    const players = [...SINGLE_PLAYER_NAMES]; 
    return {
        players: players,
        currentPlayer: 0,
        selectedStat: null,
        selectedCard: null,
        currentHand: null,
        completedHands: [],
        playerScores: players.reduce((acc, player) => ({ ...acc, [player]: 0 }), {}),
        playerBoosters: players.reduce((acc, player) => ({ 
          ...acc, 
          [player]: { orange: true, purple: true, teamrank: true } 
        }), {}),
        gamePhase: 'waiting',
        activeBooster: null,
        lastWinner: null,
        playerHands: {},
    }
  }),
  
  resetSelectionState: () => {
    set({
      selectedCard: null,
    });
  },

  triggerBotMove: (playerId) => {
    const state = get();

    if (state.players[state.currentPlayer] !== playerId || !playerId.startsWith("Bot ") || state.gamePhase === 'game_over' || state.gamePhase === 'resolution' || state.lastWinner) {
      console.log(`Bot move trigger skipped for ${playerId}. Current player: ${state.players[state.currentPlayer]}, Phase: ${state.gamePhase}, Last Winner: ${!!state.lastWinner}`);
      return;
    }

    const botHand = state.playerHands[playerId];
    if (!botHand || botHand.length === 0) {
      console.error(`Bot ${playerId} has no cards to play!`);
      return;
    }

    console.log(`Triggering move for bot: ${playerId}, Phase: ${state.gamePhase}`);

    if (state.gamePhase === 'stat_selection') {
      const availableStats = ['Batting_Average', 'Runs_Scored', 'Wickets_Taken', 'Economy_Rate', 'Batting_Strike_Rate', 'Sixes'];
      const randomStat = availableStats[Math.floor(Math.random() * availableStats.length)];
      const cardToPlay = botHand[0];

      console.log(`Bot ${playerId} choosing stat: ${randomStat} and playing card: ${cardToPlay.Player_Name} (ID: ${cardToPlay.id})`);
      get().playCardWithStat(playerId, cardToPlay, randomStat);

    } else if (state.gamePhase === 'card_selection') {
      if (!state.currentHand || !state.currentHand.selectedStat) {
          console.error(`Bot ${playerId} cannot play card - no stat selected in current hand!`);
          return;
      }
      const selectedStat = state.currentHand.selectedStat;
      const randomIndex = Math.floor(Math.random() * botHand.length);
      const cardToPlay = botHand[randomIndex];

      console.log(`Bot ${playerId} randomly playing card: ${cardToPlay.Player_Name} (ID: ${cardToPlay.id}) for stat: ${selectedStat}`);
      get().playCardWithStat(playerId, cardToPlay, selectedStat);

    } else {
       console.log(`Bot ${playerId} has nothing to do in phase ${state.gamePhase}.`);
    }
  }
}));