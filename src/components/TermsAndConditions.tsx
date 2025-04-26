import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function TermsAndConditions() {
  const navigate = useNavigate();
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-black text-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">CricCards - Terms and Conditions</h1>
          <button 
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white flex items-center"
          >
            <span className="mr-2">🏠</span>
            Back to Home
          </button>
        </div>
        
        <div className="bg-blue-800/30 backdrop-blur-sm border border-blue-700/50 rounded-xl p-6 shadow-xl mb-6">
          <p className="text-gray-300 mb-4">Last Updated: {currentDate}</p>
          
          <p className="mb-6">Welcome to CricCards! These Terms and Conditions ("Terms") govern your access to and use of our cricket card game ("Game"). Please read these Terms carefully. By accessing or using the Game, you agree to be bound by these Terms. If you do not agree to these Terms, do not use the Game.</p>
          
          <div className="space-y-6">
            <section>
              <h2 className="text-xl font-bold text-yellow-300 mb-2">1. The Game</h2>
              <p>CricCards is a cricket-themed card strategy game intended for personal entertainment. This version is provided for review and testing purposes.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold text-yellow-300 mb-2">2. License to Use</h2>
              <p>Subject to your compliance with these Terms, we grant you a limited, non-exclusive, non-transferable, non-sublicensable, revocable license to access and use the Game solely for your personal, non-commercial entertainment purposes.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold text-yellow-300 mb-2">3. User Conduct and Restrictions</h2>
              <p>You agree not to:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Use the Game for any commercial purpose.</li>
                <li>Copy, modify, distribute, sell, or lease any part of the Game.</li>
                <li>Reverse engineer or attempt to extract the source code of the Game.</li>
                <li>Use cheats, exploits, automation software, bots, hacks, mods, or any unauthorized third-party software designed to modify or interfere with the Game experience.</li>
                <li>Disrupt or overburden any computer or server used to offer or support the Game.</li>
                <li>Engage in any activity that we deem conflicts with the spirit or intent of the Game.</li>
                <li>Use the Game in any way that violates applicable laws or regulations.</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-bold text-yellow-300 mb-2">4. Intellectual Property</h2>
              <p className="mb-2"><strong>Our IP:</strong> The Game, including its software, graphics, user interface, underlying code, and all related content (excluding specific elements mentioned below), is protected by copyright and other intellectual property laws.</p>
              <p className="mb-2"><strong>Disclaimer Regarding Game Elements:</strong> The characters, player types, statistics, team identifiers (including codes and colors), and other elements within the Game are created for gameplay and entertainment purposes. While some elements may be inspired by real-world cricket, they are fictional representations. This Game is not endorsed by, sponsored by, affiliated with, or associated with any official cricket league, governing body, team, or player. Any resemblance to real persons, living or dead, or actual teams or events is intended for illustrative gameplay context only. No challenge to any third-party intellectual property rights is intended or implied.</p>
              <p><strong>Feedback:</strong> If you provide us with feedback or suggestions about the Game, you grant us the right to use that feedback without restriction or compensation to you.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold text-yellow-300 mb-2">5. Disclaimers</h2>
              <p>THE GAME IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE GAME WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold text-yellow-300 mb-2">6. Limitation of Liability</h2>
              <p>TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM (a) YOUR ACCESS TO OR USE OF OR INABILITY TO ACCESS OR USE THE GAME; (b) ANY CONDUCT OR CONTENT OF ANY THIRD PARTY ON THE GAME; OR (c) UNAUTHORIZED ACCESS, USE, OR ALTERATION OF YOUR TRANSMISSIONS OR CONTENT.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold text-yellow-300 mb-2">7. Termination</h2>
              <p>We reserve the right to suspend or terminate your access to the Game at any time, for any reason or no reason, including for breach of these Terms, without notice.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold text-yellow-300 mb-2">8. Governing Law</h2>
              <p>These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law principles.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold text-yellow-300 mb-2">9. Changes to Terms</h2>
              <p>We may modify these Terms from time to time. If we make changes, we will provide notice of such changes, such as by updating the "Last Updated" date. Your continued use of the Game after the revised Terms have become effective indicates that you have read, understood, and agreed to the current version of the Terms.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-bold text-yellow-300 mb-2">10. Contact Us</h2>
              <p>If you have any questions about these Terms, please contact us at support@criccards.game</p>
            </section>
          </div>
        </div>
        
        <div className="text-center py-4 text-gray-400 text-sm">
          <p>© {new Date().getFullYear()} CricCards. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
} 