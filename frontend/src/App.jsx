import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ComparePage from './pages/ComparePage';
import StrategyPage from './pages/StrategyPage';
import KnowledgePage from './pages/KnowledgePage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/compare" element={<ComparePage />} />
      <Route path="/strategy" element={<StrategyPage />} />
      <Route path="/knowledge" element={<KnowledgePage />} />
    </Routes>
  );
}
