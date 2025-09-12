import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import Header from './components/Layout/Header.jsx';
import Footer from './components/Layout/Footer';
import FloatingCompareBar from './components/Compare/FloatingCompareBar';
import ChatWidget from './components/ChatWidget';
import { useAuth } from './contexts/AuthContext';
import AdminChatPanel from './components/AdminChatPanel';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Compare from './pages/Compare';
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
import MyTickets from './pages/MyTickets';
import TicketDetail from './pages/TicketDetail';
import Admin from './pages/Admin';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';

import './App.css';
import ApiStatusBanner from './components/ApiStatusBanner';
import ApiDiagnostics from './components/ApiDiagnostics';

function App() {
	const { user } = useAuth();
	return (
		<Router>
			<div className="App">
				<ApiStatusBanner />
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
						<Route path="/support/tickets" element={
							<ProtectedRoute>
								<MyTickets />
							</ProtectedRoute>
						} />
						<Route path="/support/tickets/:id" element={
							<ProtectedRoute>
								<TicketDetail />
							</ProtectedRoute>
						} />
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
						<Route path="/admin-chat" element={
							<ProtectedRoute adminOnly>
								<AdminChatPanel />
							</ProtectedRoute>
						} />
						<Route path="/compare" element={<Compare />} />
					</Routes>
				</main>
				<FloatingCompareBar />
				{(!user || user.role === 'user') && <ChatWidget />}
				<Footer />
				<ApiDiagnostics />
				<Toaster
					position="top-right"
					toastOptions={{
						duration: 4000,
						style: { background: '#333', color: '#fff' }
					}}
				/>
			</div>
		</Router>
	);
}

export default App;
