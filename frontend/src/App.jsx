import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ComparePage from './pages/ComparePage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/compare" element={<ComparePage />} />
    </Routes>
  );
}
