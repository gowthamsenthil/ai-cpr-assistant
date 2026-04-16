import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import ARCPRSession from './pages/ARCPRSession';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/ar-session" element={<ARCPRSession />} />
      </Routes>
    </Router>
  );
}

export default App;
