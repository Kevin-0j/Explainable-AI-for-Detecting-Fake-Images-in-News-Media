import { useEffect, useMemo, useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { AuthPage } from './components/AuthPage';
import { Dashboard } from './components/Dashboard';
import { UploadPage } from './components/UploadPage';
import { ResultsPage } from './components/ResultsPage';
import { HistoryPage } from './components/HistoryPage';
import { SettingsPage } from './components/SettingsPage';
import JournalistToolsPage from './pages/JournalistToolsPage';
import { Navigation } from './components/Navigation';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminUserManagement } from './components/admin/AdminUserManagement';
import { AdminFileManagement } from './components/admin/AdminFileManagement';
import { AdminLogsViewer } from './components/admin/AdminLogsViewer';
import { AdminAnalytics } from './components/admin/AdminAnalytics';
import { AdminSystemSettings } from './components/admin/AdminSystemSettings';
import { AdminAuthPage } from './components/admin/AdminAuthPage';
import { BrowserRouter } from 'react-router-dom';
import { api, USE_MOCK_API } from './services/api';
import { MockApiService } from './services/mockApi';
import { toast } from 'sonner';

export interface DetectionResult {
  id: string;
  fileName: string;
  date: string;
  result: 'authentic' | 'deepfake';
  confidence: number;
  fileUrl?: string;
  userId?: string;
  modelUsed?: string;
  processingTime?: number;
  gradcamHeatmap?: string; // Base64 encoded GRAD-CAM heatmap image
  videoAnalysis?: {
    total_frames: number;
    fake_frames: number;
    real_frames: number;
    fake_ratio: number;
    frame_results: Array<{
      frame_number: number;
      prediction: string;
      confidence: number;
      heatmap?: string;
    }>;
  };
}

export interface DetectionModel {
  id: string;
  name: string;
  version: string;
  description: string;
  accuracy: number;
  speed: 'fast' | 'medium' | 'slow';
  speciality: string;
  processingTime: string;
  recommendedFor: string[];
  isPremium?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
  joinDate: string;
  lastActive: string;
  totalScans: number;
}

export interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalScans: number;
  deepfakesDetected: number;
  avgConfidence: number;
  systemUptime: string;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<string>('landing');
  
  // Add this debug line
  console.log('App rendering, currentPage:', currentPage);
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [detectionResults, setDetectionResults] = useState<DetectionResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<DetectionResult | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mockApi = useMemo(() => (USE_MOCK_API ? new MockApiService() : null), []);

  useEffect(() => {
    const bootstrap = async () => {
      if (USE_MOCK_API && mockApi) {
        try {
          const currentUser = await mockApi.verifySession();
          setUser(currentUser);
          setIsAuthenticated(true);
          setCurrentPage(currentUser.role === 'admin' ? 'admin-dashboard' : 'dashboard');
          const history = await mockApi.getDetectionHistory();
          setDetectionResults(history.results);
        } catch {
          mockApi.clearToken();
        } finally {
          setIsLoadingSession(false);
        }
        return;
      }

      // Check if token exists before trying to get user
      const token = localStorage.getItem('authToken');
      if (!token || !token.trim()) {
        // No token, user is not authenticated
        setUser(null);
        setIsAuthenticated(false);
        setDetectionResults([]);
        setSelectedResult(null);
        setCurrentPage('auth');
        setIsLoadingSession(false);
        return;
      }

      try {
        const currentUser = await api.getCurrentUser();
        setUser(currentUser);
        setIsAuthenticated(true);
        setCurrentPage(currentUser.role === 'admin' ? 'admin-dashboard' : 'dashboard');

        // Fetch data based on user role
        try {
          if (currentUser.role === 'admin') {
            // Fetch admin data
            try {
              const [allUsers, history] = await Promise.all([
                api.getAllUsers(),
                api.getDetectionHistory(),
              ]);
              setUsers(allUsers);
              setDetectionResults(history.results);
            } catch (adminError) {
              console.warn('Failed to load admin data:', adminError);
              setUsers([]);
              setDetectionResults([]);
            }
          } else {
            // Fetch regular user history
            const history = await api.getDetectionHistory();
            setDetectionResults(history.results);
          }
        } catch (dataError) {
          // Data fetch failed, but user is authenticated - just log it
          console.warn('Failed to load data:', dataError);
          setDetectionResults([]);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (
          errorMessage.includes('401') ||
          errorMessage.includes('Unauthorized') ||
          errorMessage.includes('Invalid')
        ) {
          console.warn('Authentication failed on bootstrap, clearing token');
          api.clearToken();
          toast.error('Your session expired. Please sign in again.');
          setCurrentPage('auth');
        } else {
          console.warn('Bootstrap error (may be network issue):', errorMessage);
          toast.error('Unable to restore your session. Please try again later.');
        }
        setUser(null);
        setIsAuthenticated(false);
        setDetectionResults([]);
        setSelectedResult(null);
      } finally {
        setIsLoadingSession(false);
      }
    };

    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigate = (page: string) => {
    // Clear errors when navigating to landing or auth pages
    if (page === 'landing' || page === 'auth') {
      setErrorMessage(null);
    }
    setCurrentPage(page);
  };

  const login = async (identifier: string, password: string) => {
    try {
      setErrorMessage(null);
      let authenticatedUser: User;
      if (USE_MOCK_API && mockApi) {
        const response = await mockApi.login(identifier, password);
        authenticatedUser = response.user;
      } else {
        authenticatedUser = await api.login(identifier, password);
        // Verify token is stored after login
        const tokenCheck = localStorage.getItem('authToken');
        if (!tokenCheck || !tokenCheck.trim()) {
          throw new Error('Failed to store authentication token. Please try again.');
        }
      }
      setUser(authenticatedUser);
      setIsAuthenticated(true);
      setCurrentPage(authenticatedUser.role === 'admin' ? 'admin-dashboard' : 'dashboard');
      setSelectedResult(null);
      toast.success('Welcome back!');

      // Fetch data based on user role
      try {
        if (authenticatedUser.role === 'admin') {
          // Fetch admin data
          if (!USE_MOCK_API) {
            try {
              const [allUsers, history] = await Promise.all([
                api.getAllUsers(),
                api.getDetectionHistory(),
              ]);
              setUsers(allUsers);
              setDetectionResults(history.results);
            } catch (adminError) {
              console.warn('Failed to load admin data:', adminError);
              setUsers([]);
              setDetectionResults([]);
            }
          } else if (mockApi) {
            const [allUsers, history] = await Promise.all([
              mockApi.getAllUsers(),
              mockApi.getDetectionHistory(),
            ]);
            setUsers(allUsers);
            setDetectionResults(history.results);
          }
        } else {
          // Fetch regular user history
          const history = USE_MOCK_API && mockApi
            ? await mockApi.getDetectionHistory()
            : await api.getDetectionHistory();
          setDetectionResults(history.results);
        }
      } catch (dataError) {
        console.warn('Failed to load data after login:', dataError);
        setDetectionResults([]);
        // Don't throw - login was successful
      }
    } catch (error) {
      const friendlyMessage =
        error instanceof Error ? error.message : 'Unable to login. Please try again.';
      setErrorMessage(friendlyMessage);
      toast.error(friendlyMessage);
      // Clear any partial state on login failure
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    try {
      setErrorMessage(null);
      if (USE_MOCK_API && mockApi) {
        await mockApi.signup(name, email, password);
        await login(email, password);
      } else {
        // Register - now returns token automatically, so we're already logged in
        const registeredUser = await api.register(name, email, password);
        
        // Verify token is stored after registration
        const tokenCheck = localStorage.getItem('authToken');
        if (!tokenCheck || !tokenCheck.trim()) {
          throw new Error('Failed to store authentication token. Please try logging in.');
        }
        
        setUser(registeredUser);
        setIsAuthenticated(true);
        setSelectedResult(null);
        setCurrentPage(registeredUser.role === 'admin' ? 'admin-dashboard' : 'dashboard');
        toast.success('Welcome to Newsight!');

        // Fetch history - don't fail signup if history fails
        try {
          const history = await api.getDetectionHistory();
          setDetectionResults(history.results);
        } catch (historyError) {
          console.warn('Failed to load history after signup:', historyError);
          setDetectionResults([]);
          // Don't throw - signup was successful
        }
      }
    } catch (error) {
      const friendlyMessage =
        error instanceof Error
          ? error.message
          : 'Unable to create your account. Please try again.';
      setErrorMessage(friendlyMessage);
      toast.error(friendlyMessage);
      // Clear any partial state on signup failure
      setUser(null);
      setIsAuthenticated(false);
      setSelectedResult(null);
    }
  };

  const logout = async () => {
    try {
      if (USE_MOCK_API && mockApi) {
        await mockApi.logout();
      } else {
        await api.logout();
      }
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      setDetectionResults([]);
      setSelectedResult(null);
      setErrorMessage(null); // Clear any error messages
      setCurrentPage('landing');
      toast.success('Signed out successfully.');
    }
  };

  const addDetectionResult = async (result: DetectionResult) => {
    // Add to local state immediately for UI responsiveness
    setDetectionResults(prev => [result, ...prev]);
    setSelectedResult(result);
    
    // Refresh from API to ensure we have the latest data from database
    // But preserve GRAD-CAM from the newly uploaded result
    if (!USE_MOCK_API) {
      try {
        const history = await api.getDetectionHistory();
        // Merge: preserve GRAD-CAM from the new result if it exists
        const resultInHistory = history.results.find(r => r.id === result.id);
        const mergedResults = history.results.map(historyResult => {
          // If this is the same result (by ID), preserve GRAD-CAM from the new result
          if (historyResult.id === result.id && result.gradcamHeatmap) {
            return {
              ...historyResult,
              gradcamHeatmap: result.gradcamHeatmap,
              videoAnalysis: result.videoAnalysis || historyResult.videoAnalysis
            };
          }
          return historyResult;
        });
        
        // If the new result is not in history yet (race condition), add it at the beginning
        if (!resultInHistory) {
          mergedResults.unshift(result);
        }
        
        setDetectionResults(mergedResults);
      } catch (error) {
        console.warn('Failed to refresh history after upload:', error);
        // Keep the local state if API refresh fails
      }
    }
  };

  const handleViewResult = (result: DetectionResult) => {
    setSelectedResult(result);
    setCurrentPage('results');
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const renderPage = () => {
    if (isLoadingSession) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <p className="text-muted-foreground">Loading your session...</p>
        </div>
      );
    }

    switch (currentPage) {
      case 'landing':
        console.log("### APP IS TRYING TO RENDER <LandingPage/> ###");
         return (
          <LandingPage
            navigate={navigate}
            isAuthenticated={isAuthenticated}
            errorMessage={errorMessage}
          />
        );
      case 'auth':
        return (
          <AuthPage
            navigate={navigate}
            login={login}
            signup={signup}
            errorMessage={errorMessage}
            clearError={() => setErrorMessage(null)}
          />
        );
      case 'dashboard':
        return (
          <Dashboard 
            navigate={navigate} 
            user={user} 
            logout={logout} 
            recentResults={detectionResults.slice(0, 5)} 
          />
        );
      case 'upload':
        return (
          <UploadPage 
            navigate={navigate} 
            user={user} 
            logout={logout} 
            addDetectionResult={addDetectionResult}
          />
        );
      case 'results':
        if (!selectedResult) {
          return (
            <div className="flex min-h-screen items-center justify-center bg-background">
              <p className="text-muted-foreground">
                No detection selected. Choose one from history or upload new media.
              </p>
            </div>
          );
        }
        return (
          <ResultsPage 
            navigate={navigate} 
            user={user} 
            logout={logout} 
            result={selectedResult}
          />
        );
      case 'history':
        return (
          <HistoryPage 
            navigate={navigate} 
            user={user} 
            logout={logout} 
            results={detectionResults}
            refreshHistory={async () => {
              if (!USE_MOCK_API) {
                try {
                  const history = await api.getDetectionHistory();
                  setDetectionResults(history.results);
                } catch (error) {
                  console.warn('Failed to refresh history:', error);
                }
              } else if (mockApi) {
                try {
                  const history = await mockApi.getDetectionHistory();
                  setDetectionResults(history.results);
                } catch (error) {
                  console.warn('Failed to refresh history:', error);
                }
              }
            }}
            onViewResult={handleViewResult}
          />
        );
      case 'journalist-tools':
        return (
          <div className="flex h-screen bg-[#E5E5E5]">
            <Navigation navigate={navigate} currentPage="journalist-tools" user={user} logout={logout} />
            <div className="flex-1 overflow-auto">
              <JournalistToolsPage />
            </div>
          </div>
        );
      case 'settings':
        return (
          <SettingsPage 
            navigate={navigate} 
            user={user} 
            logout={logout} 
            updateUser={updateUser}
          />
        );
      case 'admin-dashboard':
        return (
          <AdminDashboard 
            navigate={navigate} 
            user={user} 
            logout={logout} 
            users={users}
            detectionResults={detectionResults}
          />
        );
      case 'admin-users':
        return (
          <AdminUserManagement 
            navigate={navigate} 
            user={user} 
            logout={logout}
            users={users}
            setUsers={setUsers}
          />
        );
      case 'admin-files':
        return (
          <AdminFileManagement 
            navigate={navigate} 
            user={user} 
            logout={logout}
            users={users}
          />
        );
      case 'admin-logs':
        return (
          <AdminLogsViewer 
            navigate={navigate} 
            user={user} 
            logout={logout}
          />
        );
      case 'admin-analytics':
        return (
          <AdminAnalytics 
            navigate={navigate} 
            user={user} 
            logout={logout}
            users={users}
            detectionResults={detectionResults}
          />
        );
      case 'admin-settings':
        return (
          <AdminSystemSettings 
            navigate={navigate} 
            user={user} 
            logout={logout} 
          />
        );
      case 'admin-auth':
        return (
          <AdminAuthPage 
            navigate={navigate} 
            login={login} 
            signup={signup} 
          />
        );
      default:
        return (
          <LandingPage
            navigate={navigate}
            isAuthenticated={isAuthenticated}
            errorMessage={errorMessage}
          />
        );
    }
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background">
        {renderPage()}
        <button
          onClick={() => navigate('journalist-tools')}
          className="
            fixed bottom-6 right-6
            z-[9999]
            px-6 py-3
            rounded-full
            bg-[#4BA3A4]
            text-white
            shadow-xl
            font-semibold
            hover:bg-[#3b8284]
            transition
          "
        >
          🧰 Use in Tools
        </button>
      </div>
    </BrowserRouter>
  );
}
