import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { CurrencyProvider, useCurrency } from './context/CurrencyContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { ReviewsProvider } from './context/ReviewsContext';
import { ExtrasProvider } from './context/ExtrasContext';
import { InventoryProvider } from './context/InventoryContext';
import { OrderProvider } from './context/OrderContext';
import { FeedbackProvider } from './context/FeedbackContext';
import { RegistryProvider } from './context/RegistryContext';
import ProtectedRoute from './components/ProtectedRoute';
import ShopLayout from './components/Layout/ShopLayout';
import AuthLayout from './components/Layout/AuthLayout';
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import Checkout from './pages/Checkout';
import PayOrder from './pages/PayOrder';
import Contact from './pages/Contact';
import TrackOrder from './pages/TrackOrder';
import MyOrders from './pages/MyOrders';
import Orders from './pages/Orders';
import Inventory from './pages/Inventory';
import Team from './pages/Team';
import Admin from './pages/Admin';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Wishlist from './pages/Wishlist';
import Coupons from './pages/Coupons';
import Returns from './pages/Returns';
import StaffReturns from './pages/StaffReturns';
import Notifications from './pages/Notifications';
import Registry from './pages/Registry';
import MyRegistry from './pages/MyRegistry';
import RegistryView from './pages/RegistryView';

function AppContent() {
  const { currency } = useCurrency();

  return (
    <div key={currency}>
      <FeedbackProvider>
        <InventoryProvider>
          <CartProvider>
            <WishlistProvider>
              <ReviewsProvider>
                <ExtrasProvider>
                  <OrderProvider>
                    <RegistryProvider>
                      <BrowserRouter>
                        <Routes>
                          {/* Auth pages — no header/footer */}
                          <Route element={<AuthLayout />}>
                            <Route path="/login"           element={<Login />} />
                            <Route path="/register"        element={<Register />} />
                            <Route path="/forgot-password" element={<ForgotPassword />} />
                          </Route>

                          {/* Shop pages — with header/footer */}
                          <Route element={<ShopLayout />}>
                            <Route path="/"             element={<Home />} />
                            <Route path="/shop"         element={<Shop />} />
                            <Route path="/product/:id"  element={<ProductPage />} />
                            <Route path="/cart"         element={<CartPage />} />
                            <Route path="/checkout"     element={<Checkout />} />
                            <Route path="/pay/:orderId" element={<PayOrder />} />
                            <Route path="/contact"      element={<Contact />} />
                            <Route path="/track"        element={<TrackOrder />} />
                            <Route path="/my-orders"    element={<MyOrders />} />
                            <Route path="/profile"      element={<Profile />} />
                            <Route path="/wishlist"     element={<Wishlist />} />

                            {/* 🍼 Baby Registry */}
                            <Route path="/registry"          element={<Registry />} />
                            <Route path="/my-registry"       element={<MyRegistry />} />
                            <Route path="/registry/:slug"    element={<RegistryView />} />

                            <Route
                              path="/coupons"
                              element={
                                <ProtectedRoute allowedRoles={['owner']}>
                                  <Coupons />
                                </ProtectedRoute>
                              }
                            />
                            <Route path="/returns" element={<Returns />} />
                            <Route
                              path="/staff/returns"
                              element={
                                <ProtectedRoute allowedRoles={['owner', 'sales']}>
                                  <StaffReturns />
                                </ProtectedRoute>
                              }
                            />
                            <Route path="/notifications" element={<Notifications />} />

                            <Route
                              path="/orders"
                              element={
                                <ProtectedRoute allowedRoles={['owner', 'sales']}>
                                  <Orders />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/inventory"
                              element={
                                <ProtectedRoute allowedRoles={['owner', 'sales']}>
                                  <Inventory />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/team"
                              element={
                                <ProtectedRoute allowedRoles={['owner']}>
                                  <Team />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/admin"
                              element={
                                <ProtectedRoute allowedRoles={['owner']}>
                                  <Admin />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/analytics"
                              element={
                                <ProtectedRoute allowedRoles={['owner']}>
                                  <Analytics />
                                </ProtectedRoute>
                              }
                            />
                          </Route>
                        </Routes>

                        <Toaster
                          position="top-center"
                          toastOptions={{
                            duration: 2500,
                            style: {
                              background: '#fff',
                              color: '#2D2A32',
                              fontFamily: 'Nunito, system-ui, sans-serif',
                              fontWeight: 700,
                              fontSize: '14px',
                              borderRadius: '14px',
                              padding: '12px 16px',
                              boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                              border: '1px solid rgba(0,0,0,0.05)',
                            },
                            success: {
                              iconTheme: { primary: '#10b981', secondary: '#fff' },
                            },
                            error: {
                              iconTheme: { primary: '#f43f5e', secondary: '#fff' },
                            },
                          }}
                        />
                      </BrowserRouter>
                    </RegistryProvider>
                  </OrderProvider>
                </ExtrasProvider>
              </ReviewsProvider>
            </WishlistProvider>
          </CartProvider>
        </InventoryProvider>
      </FeedbackProvider>
    </div>
  );
}

export default function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <ThemeProvider>
          <CurrencyProvider>
            <AppContent />
          </CurrencyProvider>
        </ThemeProvider>
      </AuthProvider>
    </HelmetProvider>
  );
}