import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  iplstats: defineTable({
    Player_Name: v.string(),
    Batting_Average: v.union(v.number(), v.string()),
    Batting_Strike_Rate: v.union(v.number(), v.string()),
    Bowling_Average: v.optional(v.union(v.number(), v.string())),
    Bowling_Strike_Rate: v.optional(v.union(v.number(), v.string())),
    Centuries: v.number(),
    Economy_Rate: v.optional(v.union(v.number(), v.string())),
    Half_Centuries: v.number(),
    Runs_Scored: v.number(),
    Sixes: v.number(),
    Wickets_Taken: v.number(),
    team: v.optional(v.string()),
    Balls_Bowled: v.number(),
    Balls_Faced: v.number(),
    Best_Bowling_Match: v.union(v.number(), v.string()),
    Five_Wicket_Hauls: v.number(),
    Four_Wicket_Hauls: v.number(),
    Fours: v.number(),
    Highest_Score: v.union(v.number(), v.string()),
    Matches_Batted: v.number(),
    Matches_Bowled: v.number(),
    Not_Outs: v.number(),
    Runs_Conceded: v.number(),
  }),
  
  boosters: defineTable({
    Orange_Cap: v.string(),
    Purple_Cap: v.string(),
    RANK: v.number(),
    team_ranking: v.string(),
  }),
  
  stats_2025: defineTable({
    Balls_Bowled: v.number(),
    Balls_Faced: v.number(),
    Batting_Average: v.number(),
    Batting_Strike_Rate: v.number(),
    Best_Bowling_Match: v.string(),
    Bowling_Average: v.number(),
    Bowling_Strike_Rate: v.number(),
    Centuries: v.number(),
    Economy_Rate: v.number(),
    Five_Wicket_Hauls: v.number(),
    Four_Wicket_Hauls: v.number(),
    Fours: v.number(),
    Half_Centuries: v.number(),
    Highest_Score: v.string(),
    Matches_Batted: v.number(),
    Matches_Bowled: v.number(),
    Not_Outs: v.number(),
    Player_Name: v.string(),
    Runs_Conceded: v.number(),
    Runs_Scored: v.number(),
    Sixes: v.number(),
    Wickets_Taken: v.number(),
    team: v.string(),
  }),
  
  game_sessions: defineTable({
    players: v.array(v.string()),
    current_turn: v.number(),
    hands_played: v.array(v.object({
      winner: v.string(),
      stat_used: v.string(),
      cards_played: v.array(v.object({
        player_id: v.string(),
        card_id: v.string(),
        booster_used: v.optional(v.string()),
      })),
    })),
    status: v.string(), // "waiting" | "in_progress" | "completed"
    created_at: v.number(),
  }),
});