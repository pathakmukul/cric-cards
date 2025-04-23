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
    type: v.optional(v.string()),
  })
  .searchIndex("search_player_name", { searchField: "Player_Name" })
  .searchIndex("search_team", { searchField: "team" }),
  
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
  
  // New table for multiplayer lobbies
  game_lobbies: defineTable({
    lobbyId: v.string(),
    players: v.array(v.string()),
    hostPlayerName: v.string(),
    status: v.union(
      v.literal("waiting"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("abandoned")
    ),
    gameStarted: v.boolean(),
    createdAt: v.number(),
    lastMoveTime: v.optional(v.number()),
    currentPlayer: v.optional(v.string()),
    gamePhase: v.optional(v.union(
      v.literal("stat_selection"),
      v.literal("card_selection"),
      v.literal("game_over")
    )),
    playerHands: v.optional(v.any()),
    selectedStat: v.optional(v.string()),
    currentHand: v.optional(v.object({
      statSelector: v.string(),
      // Adding selectedStat field to match existing data
      selectedStat: v.optional(v.string()),
      playedCards: v.array(v.object({
        playerId: v.string(),
        cardId: v.id("iplstats"),
        cardName: v.string(),
        boosterUsed: v.optional(v.union(v.literal("orange"), v.literal("purple"), v.literal("teamrank"))),
        rawValue: v.number(),
        finalValue: v.number()
      })),
      leadingCard: v.optional(v.object({
        playerId: v.string(),
        cardId: v.id("iplstats"),
        cardName: v.string(),
        finalValue: v.number()
      }))
    })),
    completedHands: v.optional(v.array(
      v.object({
        statSelector: v.string(),
        selectedStat: v.string(),
        playedCards: v.array(v.object({
          playerId: v.string(),
          cardId: v.id("iplstats"),
          cardName: v.string(),
          boosterUsed: v.optional(v.union(v.literal("orange"), v.literal("purple"), v.literal("teamrank"))),
          rawValue: v.number(),
          finalValue: v.number()
        })),
        winner: v.union(
          v.object({
            playerId: v.string(),
            cardId: v.id("iplstats"),
            cardName: v.string(),
            finalValue: v.number()
          }),
          v.null()
        )
      })
    )),
    playerScores: v.optional(v.any()),
    playerBoosters: v.optional(v.any()),
    orangeCapPlayer: v.optional(v.string()),
    purpleCapPlayer: v.optional(v.string()),
    teamRankings: v.optional(v.any()),
  })
  .index("by_lobbyId", ["lobbyId"])
  .index("by_player", ["players"]),
  
  teamrankings: defineTable({
    RANK: v.number(),
    team_ranking: v.string(),
  }),
});

// Note: Removed the helper type/constants that were causing issues.
// Using v.any() requires careful handling in mutations to ensure the correct structure.