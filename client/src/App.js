import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';

import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import PCBuilder from './pages/PCBuilder';
import MyBuilds from './pages/MyBuilds';
import Community from './pages/Community';
import BuildDetail from './pages/BuildDetail';
import BuildDetails from './pages/BuildDetails';
import Cart from './pages/Cart';
import Wishlist from './pages/Wishlist';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Contact from './pages/Contact';
import Admin from './pages/Admin';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';

import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <Router>
            <div className="App">
              <Header />
              <main className="main-content">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/products/:id" element={<ProductDetail />} />
                  <Route path="/community" element={<Community />} />
                  <Route path="/community/builds/:id" element={<BuildDetails />} />
                  <Route path="/builds/:id" element={<BuildDetail />} />
                  <Route path="/contact" element={<Contact />} />
                  
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } />
                  <Route path="/pc-builder" element={
                    <ProtectedRoute>
                      <PCBuilder />
                    </ProtectedRoute>
                  } />
                  <Route path="/my-builds" element={
                    <ProtectedRoute>
                      <MyBuilds />
                    </ProtectedRoute>
                  } />
                  <Route path="/cart" element={
                    <ProtectedRoute>
                      <Cart />
                    </ProtectedRoute>
                  } />
                  <Route path="/wishlist" element={
                    <ProtectedRoute>
                      <Wishlist />
                    </ProtectedRoute>
                  } />
                  <Route path="/checkout" element={
                    <ProtectedRoute>
                      <Checkout />
                    </ProtectedRoute>
                  } />
                  <Route path="/orders" element={
                    <ProtectedRoute>
                      <Orders />
                    </ProtectedRoute>
                  } />
                  <Route path="/orders/:id" element={
                    <ProtectedRoute>
                      <OrderDetail />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/admin-dashboard" element={
                    <ProtectedRoute adminOnly>
                      <AdminDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/*" element={
                    <ProtectedRoute adminOnly>
                      <Admin />
                    </ProtectedRoute>
                  } />
                </Routes>
              </main>
              <Footer />
              <Toaster 
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#333',
                    color: '#fff',
                  },
                }}
              />
            </div>
          </Router>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
