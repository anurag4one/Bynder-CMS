import {
  useSDK,
  useFieldValue,
} from '@contentful/react-apps-toolkit';
import {
  Button,
  Spinner,
  Stack,
  IconButton,
  Menu,
  MenuItem,
  Popover,
} from '@contentful/f36-components';
import { MoreHorizontalIcon } from '@contentful/f36-icons';
import { useEffect, useRef, useState } from 'react';
import type { FieldAppSDK } from '@contentful/app-sdk';

type UnifiedAsset = {
  type: 'cms' | 'bynder';
  id?: string;
  title: string;
  thumbnail: string;
  originalUrl: string;
};

const App = () => {
  const sdk = useSDK<FieldAppSDK>();
  const [value, setValue] = useFieldValue<UnifiedAsset>();
  const [loading, setLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [reloadAttempts, setReloadAttempts] = useState(0);

  useEffect(() => {
    sdk.window.startAutoResizer();
  }, []);

  const fetchCMSAsset = async (assetId: string): Promise<UnifiedAsset | null> => {
    try {
      setLoading(true);
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
      console.error('[CMS Asset Fetch Error]', err);
      sdk.notifier.error('Unable to fetch CMS asset.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const openCMSSelector = async () => {
    const result = await sdk.dialogs.selectSingleAsset();
    if (result?.sys?.id) {
      const asset = await fetchCMSAsset(result.sys.id);
      if (asset) {
        sdk.field.setValue(asset);
        setValue(asset);
        setReloadAttempts(0);
      }
    }
  };


const openNewCMSAsset = async () => {
  const result = await sdk.navigator.openNewAsset({ slideIn: true });
  const assetId = result?.entity?.sys?.id;

  if (!assetId) return;

  try {
    setLoading(true);
    let attempts = 10;
    let asset = null;

    while (attempts > 0) {
      const fetched = await sdk.cma.asset.get({ assetId });
      const file = fetched.fields?.file?.[sdk.field.locale];

      if (file?.url) {
        asset = fetched;
        break;
      }

      await new Promise((res) => setTimeout(res, 1000));
      attempts--;
    }

    const fallbackTitle = 'Untitled Asset';

    const unified: UnifiedAsset = {
      type: 'cms',
      id: assetId,
      title: asset?.fields.title?.[sdk.field.locale] || fallbackTitle,
      thumbnail: asset?.fields.file?.[sdk.field.locale]?.url
        ? `https:${asset.fields.file[sdk.field.locale].url}`
        : '',
      originalUrl: asset?.fields.file?.[sdk.field.locale]?.url
        ? `https:${asset.fields.file[sdk.field.locale].url}`
        : '',
    };

    sdk.field.setValue(unified);
    setValue(unified);
    setReloadAttempts(0);

    if (!unified.thumbnail) {
      sdk.notifier.warning('Asset created, but it is not ready yet. Try reloading.');
    }

  } catch (err) {
    console.error('[Error uploading new CMS asset]', err);
    sdk.notifier.error('Failed to upload or fetch the new asset.');
  } finally {
    setLoading(false);
  }
};
 
  const openBynderDialog = async () => {
    const result = await sdk.dialogs.openCurrentApp({
      width: 800,
      minHeight: 600,
      title: 'Select Asset from Brand Portal',
    });
    console.log('bynder response', result);

    if (result?.originalUrl) {
      const bynderAsset: UnifiedAsset = {
        type: 'bynder',
        title: result.name || 'Bynder Asset',
        thumbnail: result.thumbnail,
        originalUrl: result.originalUrl,
      };
      sdk.field.setValue(bynderAsset);
      setValue(bynderAsset);
    } else {
      sdk.notifier.error('No image selected from Brand Portal.');
    }
  };

  const removeAsset = () => {
    sdk.field.removeValue();
    setValue(null);
    setReloadAttempts(0);
  };

  const reloadCMSAsset = async () => {
    if (value?.type === 'cms' && value.id) {
      const updated = await fetchCMSAsset(value.id);
      if (updated) {
        sdk.field.setValue(updated);
        setValue(updated);
        setReloadAttempts(prev => prev + 1);
        console.log('Reload clicked');
      }
    }
  };

  const openAssetEditor = async () => {
    if (value?.type === 'cms' && value.id) {
      await sdk.navigator.openAsset(value.id, {
        slideIn: true,
        waitForClose: true,
      });
      setReloadAttempts(0);
      reloadCMSAsset();
    }
  };

const renderImagePreview = (asset: UnifiedAsset) => {
  const shouldShowReload = asset.type === 'cms' && !asset.thumbnail && reloadAttempts < 2;
  const shouldShowEdit = asset.type === 'cms' && !asset.thumbnail && reloadAttempts >= 2;

  return (
    <div
      style={{
        width: 240,
        height: 160,
        position: 'relative',
        border: '1px solid #d3dce0',
        borderRadius: '4px',
        padding: '4px',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        textAlign: 'center',
      }}
    >
      {asset.thumbnail ? (
        <img
          src={asset.thumbnail}
          alt={asset.title}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
          }}
        />
      ) : (
        <span style={{ fontSize: '13px', color: '#999' }}>{asset.title}</span>
      )}

      {/* 🔁 Show reload button if image not available */}
      {/* {asset.type === 'cms' && !asset.thumbnail && (
        <Button
          size="small"
          variant="secondary"
          style={{ marginTop: '8px' }}
          onClick={reloadCMSAsset}
        >
          Reload to view media
        </Button>
      )} */}

      
     {shouldShowReload && (
          <Button
            size="small"
            variant="secondary"
            style={{ marginTop: '8px' }}
            onClick={reloadCMSAsset}
          >Reload to view media</Button>
        )}

      {shouldShowEdit && (
          <Button
            size="small"
            variant="secondary"
            style={{ marginTop: '8px' }}
            onClick={openAssetEditor}
          >Edit media</Button>
        )}


      <div style={{ position: 'absolute', top: '4px', right: '4px' }}>
        <Popover
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          placement="bottom-end"
        >
          <Popover.Trigger>
            <IconButton
              variant="transparent"
              icon={<MoreHorizontalIcon />}
              aria-label="Options"
              onClick={() => setIsMenuOpen((prev) => !prev)}
            />
          </Popover.Trigger>
          <Popover.Content>
            <Menu>
              <MenuItem onClick={() => { setIsMenuOpen(false); openBynderDialog(); }}>
                Replace with Bynder asset
              </MenuItem>
              <MenuItem onClick={() => { setIsMenuOpen(false); openCMSSelector(); }}>
                Replace with CMS asset
              </MenuItem>
              {asset.type === 'cms' && (
                <MenuItem onClick={() => { setIsMenuOpen(false); openAssetEditor(); }}>
                  Edit CMS asset
                </MenuItem>
              )}
              {asset.type === 'cms' && (
                <MenuItem onClick={() => { setIsMenuOpen(false); reloadCMSAsset(); }}>
                  Reload CMS asset
                </MenuItem>
              )}
              <MenuItem onClick={() => { setIsMenuOpen(false); removeAsset(); }}>
                Remove asset
              </MenuItem>
            </Menu>
          </Popover.Content>
        </Popover>
      </div>
    </div>
  );
};


  return (
    <div style={{ padding: 0, margin: 0 }}>
      {!value && !loading && (
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <Stack spacing="spacingS" alignItems="center" flexDirection="row" justifyContent="center">
            <Button size="small" onClick={openCMSSelector}>Add existing media</Button>
            <Button size="small" onClick={openNewCMSAsset}>Add new media</Button>
            <Button size="small" onClick={openBynderDialog}>Import from Brand Portal</Button>
          </Stack>
        </div>
      )}

      {loading && <Spinner size="large" style={{ marginTop: '1rem' }} />}

      {value && renderImagePreview(value)}
    </div>
  );
};

export default App; 