import './index.css'
import { Routes, Route } from 'react-router-dom';
import Home from './pages/home/Home.page.tsx';
import CreateRoom from './pages/create-room/CreateRoom.page.tsx';
import RoomPage from './pages/room/Room.page.tsx';

export default function RemoteAppEntry() {
  return (
    <Routes>
      <Route index element={<Home />} />
      <Route path="rooms/new" element={<CreateRoom />} />
      <Route path="rooms/:roomId" element={<RoomPage />} />
    </Routes>
  );
}
