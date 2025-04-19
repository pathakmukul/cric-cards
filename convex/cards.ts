import { query } from './_generated/server';
import { v } from 'convex/values';
import { Doc, Id } from './_generated/dataModel';

// Get all player cards from the database
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    // Use iplstats as the fallback if stats_2025 doesn't exist
    try {
      const data = await ctx.db.query('iplstats').collect();
      return data.map(player => ({
        _id: player._id,
        Player_Name: player.Player_Name,
        team: player.team,
        // Use real data from the database with 0 as fallback
        Runs_Scored: player.Runs_Scored || 0,
        Batting_Average: player.Batting_Average || 0,
        Batting_Strike_Rate: player.Batting_Strike_Rate || 0,
        Centuries: player.Centuries || 0,
        Half_Centuries: player.Half_Centuries || 0,
        Sixes: player.Sixes || 0,
        Fours: player.Fours || 0,
        Highest_Score: player.Highest_Score || '0',
        Wickets_Taken: player.Wickets_Taken || 0,
        Economy_Rate: player.Economy_Rate || 0,
        Bowling_Average: player.Bowling_Average || 0,
        Bowling_Strike_Rate: player.Bowling_Strike_Rate || 0,
        Four_Wicket_Hauls: player.Four_Wicket_Hauls || 0,
        Five_Wicket_Hauls: player.Five_Wicket_Hauls || 0
      }));
    } catch (error) {
      // Log error silently
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
    // Fetch each card document. Use Promise.all for parallel fetching.
    const cardDetails = await Promise.all(
      args.cardIds.map(cardId => ctx.db.get(cardId))
    );
    
    // Filter out any null results (if an ID didn't exist)
    // and return the array of card documents.
    // Explicitly type the result to match frontend expectations if needed.
    return cardDetails.filter(card => card !== null) as Doc<"iplstats">[];
  },
});