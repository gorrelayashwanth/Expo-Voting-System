import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const [data, setData] = useState({
    totalVotes: 0,
    projectVotes: [],
    recentVotes: [],
    servers: {
      server_1: { status: 'down' },
      server_2: { status: 'down' }
    }
  });

  const [chatQuery, setChatQuery] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  useEffect(() => {
    const fetchDashboardSummary = async () => {
      try {
        const response = await fetch('/api/dashboard-summary');
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard summary:", error);
      }
    };

    fetchDashboardSummary();
    const intervalId = setInterval(fetchDashboardSummary, 2000);
    
    return () => clearInterval(intervalId);
  }, []);

  const { totalVotes, projectVotes, recentVotes, servers } = data;

  const getServerStatusColor = (status) => {
    if (status === 'up' || status === 'healthy') return 'bg-green-500';
    if (status === 'down') return 'bg-red-500';
    return 'bg-yellow-500';
  };

  const getServerStatusText = (status) => {
    if (status === 'up' || status === 'healthy') return 'Healthy';
    if (status === 'down') return 'Down';
    return 'Warning';
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatQuery.trim()) return;

    setIsChatLoading(true);
    try {
      const response = await fetch('/api/chatbot-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: chatQuery })
      });
      if (response.ok) {
        const result = await response.json();
        setChatResponse(result.response);
      } else {
        setChatResponse("Error: Could not reach the chatbot endpoint.");
      }
    } catch (error) {
      console.error("Chatbot error:", error);
      setChatResponse("Error: Something went wrong.");
    } finally {
      setIsChatLoading(false);
      setChatQuery('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 w-full">
      <h1 className="text-4xl font-bold mb-8 text-center text-gray-800">TrustPoll Live Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow p-6 flex flex-col justify-center items-center">
          <h2 className="text-xl font-semibold text-gray-600 mb-2">Total Votes Cast</h2>
          <p className="text-5xl font-bold text-blue-600">{totalVotes}</p>
        </div>
        
        <div className={`rounded-xl shadow p-6 flex flex-col justify-center items-center text-white transition-colors duration-500 ${getServerStatusColor(servers.server_1.status)}`}>
          <h2 className="text-2xl font-bold mb-2">Server 1</h2>
          <p className="text-xl font-medium tracking-wide uppercase">
            Status: {getServerStatusText(servers.server_1.status)}
          </p>
        </div>
        
        <div className={`rounded-xl shadow p-6 flex flex-col justify-center items-center text-white transition-colors duration-500 ${getServerStatusColor(servers.server_2.status)}`}>
          <h2 className="text-2xl font-bold mb-2">Server 2</h2>
          <p className="text-xl font-medium tracking-wide uppercase">
            Status: {getServerStatusText(servers.server_2.status)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6 max-w-6xl mx-auto" style={{ height: '500px' }}>
        <h2 className="text-2xl font-semibold mb-6 text-gray-800">Votes per Project</h2>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={projectVotes} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="title" 
              angle={-45} 
              textAnchor="end" 
              interval={0} 
              height={80} 
              tick={{ fontSize: 14 }}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 14 }} />
            <Tooltip />
            <Bar dataKey="votes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl shadow p-6 max-w-6xl mx-auto mt-8">
        <h2 className="text-2xl font-semibold mb-6 text-gray-800">Recent Votes Log</h2>
        <div className="flex flex-col gap-3">
          {recentVotes && recentVotes.length > 0 ? (
            recentVotes.map((vote) => (
              <div 
                key={vote.id} 
                className="animate-slide-down bg-gray-50 border border-gray-100 p-4 rounded-lg flex items-center shadow-sm"
              >
                <span className="text-lg font-medium text-gray-700">
                  Vote &rarr; <span className="font-bold text-blue-600">{vote.title}</span> &rarr; {vote.handled_by_server} <span className="text-gray-500 text-sm">({vote.response_time_ms}ms)</span>
                </span>
              </div>
            ))
          ) : (
            <p className="text-gray-500 italic text-center py-4">No votes cast yet...</p>
          )}
        </div>
      </div>

      <div className="fixed bottom-6 right-6 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col z-50">
        <div className="bg-blue-600 text-white p-3 font-semibold flex justify-between items-center">
          <span>TrustPoll AI Assistant</span>
        </div>
        <div className="p-4 bg-gray-50 h-32 overflow-y-auto text-sm text-gray-700 flex flex-col justify-end">
          {isChatLoading ? (
            <p className="italic text-gray-500">Thinking...</p>
          ) : (
            <p>{chatResponse || "Ask me about server health or vote counts!"}</p>
          )}
        </div>
        <form onSubmit={handleChatSubmit} className="border-t border-gray-200 flex">
          <input 
            type="text" 
            value={chatQuery} 
            onChange={e => setChatQuery(e.target.value)} 
            placeholder="Type 'health' or 'votes'..." 
            className="flex-1 p-3 outline-none text-sm text-gray-800 bg-white"
            disabled={isChatLoading}
          />
          <button 
            type="submit" 
            disabled={isChatLoading}
            className="bg-blue-600 text-white px-4 font-medium hover:bg-blue-700 transition-colors disabled:bg-blue-400"
          >
            Ask
          </button>
        </form>
      </div>
    </div>
  );
}
