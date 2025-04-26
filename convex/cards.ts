import { query } from './_generated/server';
import { v } from 'convex/values';
import { Doc, Id } from './_generated/dataModel';

// Get all player cards from the database
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    try {
      // Filter at the database level - only reject cards where 
      // BOTH Balls_Bowled AND Balls_Faced are zero or null
      const data = await ctx.db.query('iplstats')
        .filter(q => 
          q.not(
            q.and(
              q.or(q.eq(q.field("Balls_Bowled"), 0), q.eq(q.field("Balls_Bowled"), null)),
              q.or(q.eq(q.field("Balls_Faced"), 0), q.eq(q.field("Balls_Faced"), null))
            )
          )
        )
        .collect();
      
      console.log(`Returning ${data.length} cards with either balls bowled or faced > 0 from database query`);
      
      return data;
    } catch (error) {
      console.error("Error fetching cards:", error);
      return [];
    }
  },
});

// Get the boosters data (orange cap, purple cap holders)
export const getBoosters = query({
  args: {},
  handler: async (ctx) => {
    try {
      const data = await ctx.db.query('boosters').collect();
      if (data.length === 0) {
        // Return default boosters if none exist
        return [{
          _id: 'default',
          Orange_Cap: 'Virat Kohli',
          Purple_Cap: 'Jasprit Bumrah'
        }];
      }
      return data;
    } catch (error) {
      // Log error silently
      return [{
        _id: 'default',
        Orange_Cap: 'Virat Kohli',
        Purple_Cap: 'Jasprit Bumrah'
      }];
    }
  },
});

// Get team rankings
export const getTeamRankings = query({
  args: {},
  handler: async (ctx) => {
    try {
      const data = await ctx.db.query('boosters').collect();
      if (data.length === 0) {
        // Return default team rankings if none exist
        return [
          { _id: 'rank1', team_ranking: 'Mumbai Indians', RANK: 1 },
          { _id: 'rank2', team_ranking: 'Chennai Super Kings', RANK: 2 },
          { _id: 'rank3', team_ranking: 'Royal Challengers Bangalore', RANK: 3 },
          { _id: 'rank4', team_ranking: 'Delhi Capitals', RANK: 4 }
        ];
      }
      return data;
    } catch (error) {
      // Log error silently
      return [
        { _id: 'rank1', team_ranking: 'Mumbai Indians', RANK: 1 },
        { _id: 'rank2', team_ranking: 'Chennai Super Kings', RANK: 2 },
        { _id: 'rank3', team_ranking: 'Royal Challengers Bangalore', RANK: 3 },
        { _id: 'rank4', team_ranking: 'Delhi Capitals', RANK: 4 }
      ];
    }
  },
});

// Get full details for a specific list of card IDs
export const getCardDetails = query({
  args: {
    cardIds: v.array(v.id("iplstats"))
  },
  handler: async (ctx, args) => {
    if (args.cardIds.length === 0) {
      return [];
    }
    
    // Since we're fetching specific card IDs that were already filtered by getAll
    // or are actively being used in a game, we can simply return them
    const cardDetails = await Promise.all(
      args.cardIds.map(cardId => ctx.db.get(cardId))
    );
    
    // Just filter out null results (IDs that don't exist)
    const validCards = cardDetails.filter(card => card !== null) as Doc<"iplstats">[];
    
    return validCards;
  },
});