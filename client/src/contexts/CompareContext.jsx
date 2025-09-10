import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import axios from 'axios';

const CompareContext = createContext();

const MAX_COMPARE = 4;

const initialState = {
  items: [], // array of product objects (minimal props) or ids while loading
};

function reducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      const exists = state.items.find(p => p._id === action.payload._id);
      if (exists) return state;
      if (state.items.length >= MAX_COMPARE) return state; // ignore if full
      return { ...state, items: [...state.items, action.payload] };
    }
    case 'REMOVE':
      return { ...state, items: state.items.filter(p => p._id !== action.payload) };
    case 'CLEAR':
      return { ...state, items: [] };
    case 'HYDRATE_MISSING': {
      // Replace placeholders with loaded products
      const map = new Map(state.items.map(i => [i._id, i]));
      action.payload.forEach(prod => { map.set(prod._id, prod); });
      return { ...state, items: Array.from(map.values()) };
    }
    default:
      return state;
  }
}

export const CompareProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Add by product object (expects at least _id, name, price, images, brand, category)
  const addToCompare = useCallback((product) => {
    if (!product || !product._id) return;
    dispatch({ type: 'ADD', payload: product });
  }, []);

  const removeFromCompare = useCallback((productId) => {
    dispatch({ type: 'REMOVE', payload: productId });
  }, []);

  const clearCompare = useCallback(() => dispatch({ type: 'CLEAR' }), []);

  const isCompared = useCallback((productId) => state.items.some(p => p._id === productId), [state.items]);

  // Optional: persist in localStorage
  useEffect(() => {
    const ids = state.items.map(p => p._id);
    localStorage.setItem('compareItems', JSON.stringify(ids));
  }, [state.items]);

  // On mount, hydrate from localStorage
  useEffect(() => {
    const raw = localStorage.getItem('compareItems');
    if (!raw) return;
    try {
      const ids = JSON.parse(raw);
      if (Array.isArray(ids) && ids.length) {
        // insert temporary placeholders
        ids.forEach(id => dispatch({ type: 'ADD', payload: { _id: id, loading: true } }));
        axios.all(ids.map(id => axios.get(`/api/products/${id}`)))
          .then(results => {
            const products = results.map(r => r.data.product).filter(Boolean);
            dispatch({ type: 'HYDRATE_MISSING', payload: products });
          })
          .catch(() => {});
      }
    } catch (e) { /* ignore */ }
  }, []);

  const value = {
    compareItems: state.items,
    max: MAX_COMPARE,
    addToCompare,
    removeFromCompare,
    clearCompare,
    isCompared
  };

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
};

export const useCompare = () => {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error('useCompare must be used within CompareProvider');
  return ctx;
};
