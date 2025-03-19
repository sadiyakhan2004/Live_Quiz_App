'use client';

import React from 'react';
import { Provider } from 'react-redux';
import { store, persistor } from './store';
import { PersistGate } from 'redux-persist/integration/react'

interface ProviderProps {
  children: React.ReactNode;
}

export function ReduxProvider({ children }: ProviderProps) {

 
  return (
    <Provider store={store}>
      <PersistGate  persistor={persistor}>
      {children}
      </PersistGate>
    </Provider>
  );
}