// File: convex/updateTeamNames.ts

import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

// --- Configuration ---
// Define allowed table names more precisely
const TABLE_NAMES = ["stats_2025", "iplstats"] as const;
type TableName = typeof TABLE_NAMES[number]; // Union type of allowed table names
const COLUMN_NAME = "team";    // The column containing team names
// --- End Configuration ---

// Mapping of current team names/abbreviations to desired 3-letter city codes
// NOTE: Add any variations present in your data (e.g., different capitalizations, older names)
const teamNameToCityCode: Record<string, string> = {
    // Chennai Super Kings
    "Chennai Super Kings": "CHE",
    "CSK": "CHE",

    // Delhi Capitals
    "Delhi Capitals": "DEL",
    "DC": "DEL",

    // Gujarat Titans (Ahmedabad)
    "Gujarat Titans": "GUJ",
    "GT": "GUJ",

    // Kolkata Knight Riders
    "Kolkata Knight Riders": "KOL",
    "KKR": "KOL",

    // Lucknow Super Giants
    "Lucknow Super Giants": "LKN",
    "LSG": "LKN",

    // Mumbai Indians
    "Mumbai Indians": "MUM",
    "MI": "MUM",

    // Punjab Kings (Mohali)
    "Punjab Kings": "PUN",
    "PBKS": "PUN",

    // Rajasthan Royals (Jaipur)
    "Rajasthan Royals": "RAJ",
    "RR": "RAJ",

    // Royal Challengers Bengaluru (Note: Name changed from Bangalore)
    "Royal Challengers Bengaluru": "BLR",
    "RCB": "BLR",
    "Royal Challengers Bangalore": "BLR", // Handle potential old name

    // Sunrisers Hyderabad
    "Sunrisers Hyderabad": "HYD",
    "SRH": "HYD",

    // Add any other variations you might have in your 'team' column
};

export const updateTeamNamesToCityCodes = mutation({
    args: {}, // No arguments needed for this specific, one-off task
    handler: async (ctx) => {
        const results = {
            status: "Completed",
            tables: {} as Record<string, {
                updated: number,
                skipped: number,
                unmapped: string[]
            }>
        };

        // Process each table
        for (const tableName of TABLE_NAMES) {
            console.log(`Starting update for table '${tableName}', column '${COLUMN_NAME}'...`);

            // 1. Fetch all documents from the specified table
            const documents = await ctx.db.query(tableName).collect();

            let updatedCount = 0;
            let skippedCount = 0;
            const unmappedTeams = new Set<string>();

            // 2. Iterate through each document
            for (const doc of documents) {
                // Safely check and process the team field regardless of table type
                const teamValue = doc[COLUMN_NAME];
                
                // Check if the document has the specified column and it's a string
                if (typeof teamValue !== 'string') {
                    console.warn(`Document ID ${doc._id} skipped: Column '${COLUMN_NAME}' is not a string or is missing.`);
                    skippedCount++;
                    continue;
                }

                const mappedCode = teamNameToCityCode[teamValue];

                // 3. Check if a mapping exists for the current team value
                if (mappedCode) {
                    // 4. Only update if the current value is different from the target code
                    if (teamValue !== mappedCode) {
                        try {
                            await ctx.db.patch(doc._id, { [COLUMN_NAME]: mappedCode });
                            updatedCount++;
                        } catch (error) {
                            console.error(`Failed to update document ID ${doc._id}:`, error);
                            skippedCount++;
                        }
                    } else {
                        // Already has the correct code, skip patching
                        skippedCount++;
                    }
                } else {
                    // No mapping found for this team value
                    // Check if it already looks like a 3-letter code - if so, maybe it's fine?
                    if (teamValue.length !== 3 || teamValue !== teamValue.toUpperCase()) {
                         // Only log as unmapped if it doesn't look like an existing code
                         unmappedTeams.add(teamValue);
                    }
                    skippedCount++;
                }
            }

            // 5. Log results for this table
            console.log(`Update complete for table '${tableName}'.`);
            console.log(`- Records updated: ${updatedCount}`);
            console.log(`- Records skipped (already correct, missing column, error, or unmapped): ${skippedCount}`);
            if (unmappedTeams.size > 0) {
                console.warn(`- The following team values were found in column '${COLUMN_NAME}' but had no mapping defined:`);
                unmappedTeams.forEach(team => console.warn(`  - "${team}"`));
                console.warn("Consider adding these to the 'teamNameToCityCode' map if they need conversion.");
            }

            // Store results for this table
            results.tables[tableName] = {
                updated: updatedCount,
                skipped: skippedCount,
                unmapped: Array.from(unmappedTeams)
            };
        }

        return results;
    },
});

// Optional: Add a query function to easily test results
import { query } from "./_generated/server";

export const getTeamStatsSample = query({
    args: { 
        tableName: v.union(v.literal("stats_2025"), v.literal("iplstats")),
        count: v.optional(v.number()) 
    },
    handler: async (ctx, args) => {
        const { tableName, count } = args;
        const limit = count ?? 10;
        return await ctx.db.query(tableName).order("desc").take(limit);
    },
});