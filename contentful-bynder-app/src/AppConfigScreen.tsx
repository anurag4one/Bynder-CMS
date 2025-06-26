import React from 'react';
import { TextInput, FormLabel, Stack } from '@contentful/f36-components';
import { useSDK } from '@contentful/react-apps-toolkit';

const AppConfigScreen = () => {
  const sdk = useSDK();
  const [bynderToken, setBynderToken] = React.useState('');
  const [bynderDomain, setBynderDomain] = React.useState('');

  React.useEffect(() => {
    const currentParams = sdk.parameters?.instance || {};
    if (currentParams.bynderToken) setBynderToken(currentParams.bynderToken);
    if (currentParams.bynderDomain) setBynderDomain(currentParams.bynderDomain);

    sdk.app.setReady();
    sdk.app.setConfigurationReady(true);
  }, [sdk]);

  sdk.app.onConfigure(() => {
    return {
      parameters: {
        bynderToken,
        bynderDomain,
      },
    };
  });

  return (
    <Stack spacing="spacingL">
      <div>
        <FormLabel>Bynder Permanent Token</FormLabel>
        <TextInput
          value={bynderToken}
          onChange={(e) => setBynderToken(e.target.value)}
          name="bynderToken"
          placeholder="Enter your Bynder permanent token"
        />
      </div>
      <div>
        <FormLabel>Bynder Domain</FormLabel>
        <TextInput
          value={bynderDomain}
          onChange={(e) => setBynderDomain(e.target.value)}
          name="bynderDomain"
          placeholder="e.g. https://brandportal.ingkacentres.com"
        />
      </div>
    </Stack>
  );
};

export default AppConfigScreen;
