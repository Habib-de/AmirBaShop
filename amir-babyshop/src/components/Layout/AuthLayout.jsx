import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amir-pink/40 via-amir-purple/30 to-amir-blue/40">
      <Outlet />
    </div>
  );
}