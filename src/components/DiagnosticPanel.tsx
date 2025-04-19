import React, { useState } from 'react';

interface DiagnosticPanelProps {
  apiState: {
    cardsAvailable: boolean;
    boostersAvailable: boolean;
    teamRankingsAvailable: boolean;
    lobbyApiAvailable: boolean;
  };
  multiplayer: {
    isActive: boolean;
    playerName: string;
    lobbyId: string;
    lobbyDataAvailable: boolean;
  };
}

const DiagnosticPanel: React.FC<DiagnosticPanelProps> = ({ apiState, multiplayer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-2 right-2 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gray-800 text-white px-3 py-2 rounded-md text-sm font-medium"
      >
        {isOpen ? 'Hide Debug' : 'Show Debug'}
      </button>
      
      {isOpen && (
        <div className="absolute bottom-12 right-0 w-80 bg-gray-900/90 text-white p-4 rounded-md shadow-lg">
          <h3 className="text-lg font-bold mb-2">API Diagnostics</h3>
          
          <div className="space-y-1 mb-4">
            <div className="flex justify-between">
              <span>Core Cards API:</span>
              <span className={apiState.cardsAvailable ? "text-green-400" : "text-red-400"}>
                {apiState.cardsAvailable ? "Available" : "Unavailable"}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span>Boosters API:</span>
              <span className={apiState.boostersAvailable ? "text-green-400" : "text-red-400"}>
                {apiState.boostersAvailable ? "Available" : "Unavailable"}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span>Team Rankings API:</span>
              <span className={apiState.teamRankingsAvailable ? "text-green-400" : "text-red-400"}>
                {apiState.teamRankingsAvailable ? "Available" : "Unavailable"}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span>Lobby API:</span>
              <span className={apiState.lobbyApiAvailable ? "text-green-400" : "text-red-400"}>
                {apiState.lobbyApiAvailable ? "Available" : "Unavailable"}
              </span>
            </div>
          </div>
          
          <h3 className="text-lg font-bold mb-2">Multiplayer Status</h3>
          
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Multiplayer:</span>
              <span className={multiplayer.isActive ? "text-blue-400" : "text-gray-400"}>
                {multiplayer.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            
            {multiplayer.isActive && (
              <>
                <div className="flex justify-between">
                  <span>Player Name:</span>
                  <span className="text-yellow-400">{multiplayer.playerName}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Lobby ID:</span>
                  <span className="text-yellow-400">{multiplayer.lobbyId}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Lobby Data:</span>
                  <span className={multiplayer.lobbyDataAvailable ? "text-green-400" : "text-red-400"}>
                    {multiplayer.lobbyDataAvailable ? "Available" : "Missing"}
                  </span>
                </div>
              </>
            )}
          </div>
          
          <div className="mt-4 text-xs text-gray-400">
            <p>If APIs show as unavailable, try running:</p>
            <pre className="bg-black p-1 mt-1 rounded">npx convex dev</pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiagnosticPanel; 