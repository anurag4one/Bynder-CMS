// FieldApp.tsx
import { useSDK, useFieldValue } from '@contentful/react-apps-toolkit';
import { Menu, MenuItem, Button, Popover } from '@contentful/f36-components';
import { useRef, useState } from 'react';
import type { FieldAppSDK } from '@contentful/app-sdk';

const FieldApp = () => {
  const sdk = useSDK<FieldAppSDK>();
  const [asset, setAsset] = useFieldValue<string>();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const openEntrySelector = async () => {
    const result = await sdk.dialogs.selectSingleAsset();
    if (result && 'sys' in result) {
      setAsset((result as any).sys.id);
    }
  };

  const openNewAsset = async () => {
    const result = await sdk.navigator.openNewAsset({ slideIn: true });
    if (result && 'sys' in result) {
      setAsset((result as any).sys.id);
    }
  };

  const openBynderDialog = async () => {
    const url = await sdk.dialogs.openCurrentApp({
      position: 'center',
      minHeight: 600,
      width: 800,
    });
    if (url) {
      setAsset(url); // Save the selected Bynder asset URL
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem', border: '2px dashed #ccc', borderRadius: '12px', alignItems: 'center', height: '40vh' }}>
      <Popover isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} placement="bottom-start">
        <Popover.Trigger>
          <Button variant="secondary" onClick={() => setIsMenuOpen((open) => !open)}  ref={buttonRef as any} >
            + Add media ▾
          </Button>
        </Popover.Trigger>
        <Popover.Content>
          <Menu>
            <MenuItem onClick={() => { setIsMenuOpen(false); openEntrySelector(); }}>
              Add existing media
            </MenuItem>
            <MenuItem onClick={() => { setIsMenuOpen(false); openNewAsset(); }}>
              Add new media
            </MenuItem>
            <MenuItem onClick={() => { setIsMenuOpen(false); openBynderDialog(); }}>
              Import from Bynder
            </MenuItem>
          </Menu>
        </Popover.Content>
      </Popover>
    </div>
  );
};

export default FieldApp;
