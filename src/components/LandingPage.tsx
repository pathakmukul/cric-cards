import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket as Cricket } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
      <div className="text-center">
        <div className="flex justify-center mb-8">
          <Cricket className="w-20 h-20 text-white" />
        </div>
        <h1 className="text-6xl font-bold text-white mb-4">IPL Card Battle</h1>
        <p className="text-xl text-gray-300 mb-8">Challenge your friends in the ultimate IPL card game!</p>
        <button
          onClick={() => navigate('/game')}
          className="px-8 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold rounded-lg text-xl 
                   transform transition hover:scale-105 hover:shadow-xl"
        >
          Play Now
        </button>
      </div>
    </div>
  );
}