import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from './theme';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CheckoutPage from './pages/CheckoutPage';
import ValidationPage from './pages/ValidationPage';
import ReturnPage from './pages/ReturnPage';
import EquipmentInventory from './pages/EquipmentInventory';
import Users from './pages/Users';
import AccountTypes from './pages/AccountTypes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="checkout" element={<CheckoutPage />} />
              <Route path="return" element={<ReturnPage />} />
              <Route path="inventory" element={<EquipmentInventory />} />
              <Route path="users" element={<Users />} />
              <Route path="account-types" element={<AccountTypes />} />
            </Route>
            <Route path="/validate" element={<ValidationPage />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
