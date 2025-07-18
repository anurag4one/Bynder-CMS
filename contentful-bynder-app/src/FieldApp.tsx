import { useSDK, useFieldValue } from '@contentful/react-apps-toolkit';
import { Menu, MenuItem, Button, Popover } from '@contentful/f36-components';
import { useRef, useState } from 'react';
import type { FieldAppSDK } from '@contentful/app-sdk';

type UnifiedAsset = {
  type: 'cms' | 'bynder';
  id?: string; // only for CMS
  title: string;
  thumbnail: string;
  originalUrl: string;
};

const FieldApp = () => {
  const sdk = useSDK<FieldAppSDK>();
  const [asset, setAsset] = useFieldValue<UnifiedAsset | null>();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const fetchCMSAsset = async (assetId: string): Promise<UnifiedAsset | null> => {
    try {
      const asset = await sdk.cma.asset.get({ assetId });
      const locale = sdk.field.locale;
      const file = asset.fields.file?.[locale];
      const title = asset.fields.title?.[locale] || 'Untitled Asset';
      const thumbnail = file?.url ? `https:${file.url}` : '';
      const originalUrl = file?.url ? `https:${file.url}` : '';

      return {
        type: 'cms',
        id: assetId,
        title,
        thumbnail,
        originalUrl,
      };
    } catch (err) {
      console.error('Error fetching CMS asset:', err);
      sdk.notifier.error('Unable to fetch CMS asset.');
      return null;
    }
  };

  const openEntrySelector = async () => {
    const result = await sdk.dialogs.selectSingleAsset();
    if (result?.sys?.id) {
      const unifiedAsset = await fetchCMSAsset(result.sys.id);
      if (unifiedAsset) {
        setAsset(unifiedAsset);
      }
    }
  };

  const openNewAsset = async () => {
    const result = await sdk.navigator.openNewAsset({ slideIn: true });
    const assetId = result?.entity?.sys?.id;
    if (assetId) {
      const unifiedAsset = await fetchCMSAsset(assetId);
      if (unifiedAsset) {
        setAsset(unifiedAsset);
      }
    }
  };


  const openBynderDialog = async () => {
    const result = await sdk.dialogs.openCurrentApp({
      position: 'center',
      minHeight: 600,
      width: 800,
    });

    // result is already in unified format
    if (result?.type === 'bynder') {
      setAsset(result);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        padding: '1rem',
        border: '2px dashed #ccc',
        borderRadius: '12px',
        alignItems: 'center',
        height: '40vh',
      }}
    >
      <Popover
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        placement="bottom-start"
      >
        <Popover.Trigger>
          <Button
            variant="secondary"
            onClick={() => setIsMenuOpen((open) => !open)}
            ref={buttonRef as any}
          >
            + Add media ▾
          </Button>
        </Popover.Trigger>
        <Popover.Content>
          <Menu>
            <MenuItem
              onClick={() => {
                setIsMenuOpen(false);
                openEntrySelector();
              }}
            >
              Add existing media
            </MenuItem>
            <MenuItem
              onClick={() => {
                setIsMenuOpen(false);
                openNewAsset();
              }}
            >
              Add new media
            </MenuItem>
            <MenuItem
              onClick={() => {
                setIsMenuOpen(false);
                openBynderDialog();
              }}
            >
              Import from Bynder
            </MenuItem>
          </Menu>
        </Popover.Content>
      </Popover>
    </div>
  );
};

export default FieldApp;
 