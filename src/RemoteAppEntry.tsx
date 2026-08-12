import { Routes, Route } from 'react-router-dom';
import Home from './pages/home/Home.page.tsx';

export default function RemoteAppEntry() {
  return (
    <Routes>
      <Route index element={<Home />} /> 
    </Routes>
  );
}