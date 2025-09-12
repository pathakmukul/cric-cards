# CricCards
https://cric-cards.vercel.app/

**CricCards** is a 3D IPL cricket card game where players compete with cricket stat-based cards in a fixed-camera virtual arena.

## Features

- 3D gameplay with immersive fixed camera view
- Game modes: Solo (vs AI), Random PvP, Private lobby with invite code
- Each player is dealt 5 IPL player cards with detailed batting and bowling stats
- Stat selection and card play decide round winners (e.g., Runs, Strike Rate, Wickets, etc.)
- Special one-time-use boosters:
  - 🔶 Orange Cap (10% stat boost)
  - 🔷 Purple Cap (20% stat boost)
  - 🏆 Team Rank (stat adjusts by team's ranking)
- 5-round matches; most rounds won takes the game
- Smooth UI, lively effects, winner screens, and feedback

## Tech Stack

- **Frontend:** React, TypeScript, Zustand, Three.js, React Three Fiber, TailwindCSS, Framer Motion
- **Backend/Realtime:** Convex (lobby logic, multiplayer state, database)
- Deployed on: Vercel
