'use client';

import { configureStore } from '@reduxjs/toolkit';
import questionReducer from './features/questionSlice';
import { persistReducer, persistStore } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from 'redux';

// Noop storage for SSR (fallback)
const createNoopStorage = () => ({
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
});

const isClient = typeof window !== 'undefined';
const safeStorage = isClient ? storage : createNoopStorage(); 

// Combine reducers
const rootReducer = combineReducers({
  questions: questionReducer,
});

// Persist config
const persistConfig = {
  key: 'root',
  storage: safeStorage, 
};

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
