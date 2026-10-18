import { useAuth } from '../context/AuthContext';
import ShopHome from './ShopHome';
import StaffHome from './StaffHome';

export default function Home() {
  const { isStaff } = useAuth();
  return isStaff ? <StaffHome /> : <ShopHome />;
}