import React from 'react';
import ReactDOM from 'react-dom/client';
import { SDKProvider, useSDK } from '@contentful/react-apps-toolkit';
import App from './App';
import BynderDialog from './BynderDialog';
import { locations } from '@contentful/app-sdk';

const Root = () => {
  const sdk = useSDK();

  if (sdk.location.is(locations.LOCATION_DIALOG)) {
    return <BynderDialog />;
  }

  return <App />;
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <SDKProvider>
    <Root />
  </SDKProvider>
);
