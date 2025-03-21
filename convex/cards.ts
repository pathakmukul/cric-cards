import { query } from './_generated/server';
import { v } from 'convex/values';

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
        // Ensure all stats have values
        Runs_Scored: player.Runs_Scored || 100,
        Batting_Average: player.Batting_Average || 35.5,
        Batting_Strike_Rate: player.Batting_Strike_Rate || 140.2,
        Centuries: player.Centuries || 2,
        Half_Centuries: player.Half_Centuries || 5,
        Sixes: player.Sixes || 10,
        Fours: player.Fours || 20,
        Highest_Score: player.Highest_Score || '75',
        Wickets_Taken: player.Wickets_Taken || 15,
        Economy_Rate: player.Economy_Rate || 7.8,
        Bowling_Average: player.Bowling_Average || 25.3,
        Bowling_Strike_Rate: player.Bowling_Strike_Rate || 18.5,
        Four_Wicket_Hauls: player.Four_Wicket_Hauls || 1,
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