import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';

const ProjectSelection = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const voterId = location.state?.voter_id;

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // If we landed here without a voterId, we should probably redirect or warn.
    // However, for testing, we can tolerate it or warn in the UI.
    
    const fetchProjects = async () => {
      try {
        const response = await apiClient.get('/projects');
        setProjects(response.data || []);
      } catch (err) {
        setError('Failed to load projects. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const filteredProjects = useMemo(() => {
    if (!searchQuery) return projects;
    const lowerQuery = searchQuery.toLowerCase();
    return projects.filter(p => 
      String(p.project_number).includes(lowerQuery) || 
      (p.title && p.title.toLowerCase().includes(lowerQuery))
    );
  }, [projects, searchQuery]);

  const handleSubmit = async () => {
    if (!selectedProjectId) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    setSubmitting(true);
    setError(null);
    try {
      const response = await apiClient.post('/vote', {
        voter_id: voterId,
        project_id: selectedProjectId,
        token: token
      });
      
      // Navigate to confirmation screen, passing server info if available
      navigate('/success', { 
        replace: true,
        state: { server: response.data?.handled_by_server } 
      });
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to submit vote. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-50 px-4 py-8 font-sans text-gray-900 w-full">
      <div className="w-full max-w-md space-y-6 flex flex-col h-full max-h-screen">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Select Project</h1>
          <p className="text-gray-600 mt-2">Find the project you wish to vote for.</p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm shrink-0">
            {error}
          </div>
        )}

        <div className="relative shrink-0">
          <input
            type="text"
            placeholder="Search by project number or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={loading || projects.length === 0}
            className="w-full p-4 pl-11 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-shadow disabled:bg-gray-100 disabled:opacity-70"
          />
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex-1 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-sm min-h-[300px] flex flex-col">
          {loading ? (
            // Skeleton Loader for Zero-Lag Layout Shift rule
            <div className="p-4 space-y-4 w-full animate-pulse">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex gap-4 items-center">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg shrink-0"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-gray-500">
              <p className="text-lg">Project list not yet available &mdash; please check back shortly</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-gray-500">
              <p>No projects match your search.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filteredProjects.map((project) => {
                const isSelected = selectedProjectId === project.id;
                return (
                  <li key={project.id}>
                    <button
                      onClick={() => setSelectedProjectId(project.id)}
                      className={`w-full text-left p-4 hover:bg-gray-50 transition-colors flex items-center gap-4 ${isSelected ? 'bg-teal-50 hover:bg-teal-50' : ''}`}
                    >
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg shrink-0 transition-colors ${isSelected ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                        {project.project_number}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold truncate ${isSelected ? 'text-teal-900' : 'text-gray-900'}`}>
                          {project.title}
                        </p>
                        {project.team_name && (
                          <p className={`text-sm truncate ${isSelected ? 'text-teal-700' : 'text-gray-500'}`}>
                            {project.team_name}
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <svg className="w-6 h-6 text-teal-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="pt-4 shrink-0 pb-8">
          <button
            onClick={handleSubmit}
            disabled={!selectedProjectId || submitting || loading || projects.length === 0}
            className="w-full flex items-center justify-center py-4 px-6 bg-teal-600 text-white rounded-xl shadow-sm text-lg font-medium hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-all duration-200 active:scale-[0.98] min-h-[56px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting Vote...' : 'Submit Vote'}
          </button>
          {!voterId && !loading && (
            <p className="text-xs text-red-500 text-center mt-2">Warning: Missing voter context. Start from the beginning.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectSelection;
