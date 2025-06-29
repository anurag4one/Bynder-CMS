import {
  useSDK,
  useFieldValue,
} from '@contentful/react-apps-toolkit';
import {
  Menu,
  MenuItem,
  Button,
  Popover,
  IconButton,
  Spinner,
  Stack,
} from '@contentful/f36-components';
import { MoreHorizontalIcon } from '@contentful/f36-icons';
import { useRef, useState, useEffect } from 'react';
import type { FieldAppSDK, Link } from '@contentful/app-sdk';

const App = () => {
  const sdk = useSDK<FieldAppSDK>();
  const [assetLink, setAssetLink] = useFieldValue<Link>();
  const [assetMeta, setAssetMeta] = useState<any>(null);
  const [bynderAsset, setBynderAsset] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    sdk.window.startAutoResizer();
  }, []);

  const fetchAssetMeta = async (id: string) => {
    try {
      setLoading(true);
      const asset = await sdk.cma.asset.get({ assetId: id });
      const locale = sdk.field.locale;
      const file = asset.fields.file?.[locale];

      const thumbnailUrl = file?.url ? `https:${file.url}` : null;

      // Always store the asset ID and optionally the URL
      setAssetMeta({
        id,
        url: thumbnailUrl,
        title: asset.fields?.title?.[locale] || 'Untitled Asset',
        hasFile: !!thumbnailUrl,
      });
    } catch (err) {
      console.error('[Asset Fetch Error]', err);
      setAssetMeta(null);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (assetLink?.sys?.id) {
      fetchAssetMeta(assetLink.sys.id);
    } else {
      setAssetMeta(null);
    }
  }, [assetLink]);

  useEffect(() => {
    const currentValue = sdk.field.getValue();
    setBynderAsset(currentValue);

    const detach = sdk.field.onValueChanged((newValue) => {
      setBynderAsset(newValue);
    });

    return () => detach();
  }, []);

  const selectAsset = (id: string) => {
    const link: Link = {
      sys: {
        type: 'Link',
        linkType: 'Asset',
        id,
      },
    };
    fetchAssetMeta(id);
    sdk.field.setValue(link);
  };

  const openEntrySelector = async () => {
    const result = await sdk.dialogs.selectSingleAsset();
    if (result?.sys?.id) {
      try {
        const asset = await sdk.cma.asset.get({ assetId: result.sys.id });
        if (asset) {
          selectAsset(result.sys.id);
        }
      } catch (err) {
        console.error('Selected asset not found or inaccessible:', err);
        sdk.notifier.error('Selected media not found or was deleted.');
      }
    }
  };


  const openNewAsset = async () => {
    const result = await sdk.navigator.openNewAsset({ slideIn: true });
    const assetId = result?.entity?.sys?.id;

    if (!assetId) {
      console.log('Asset creation cancelled or not completed.');
      return;
    }
      if (assetId) {
        try {
          const asset = await sdk.cma.asset.get({ assetId: assetId });
          if (asset) {
            selectAsset(assetId);
          }
        } catch (err) {
          console.error('Selected asset not found or inaccessible:', err);
          sdk.notifier.error('Selected media not found or was deleted.');
        }
      }
  };


  const openBynderDialog = async () => {
    const result = await sdk.dialogs.openCurrentApp({
      width: 800,
      minHeight: 600,
      title: 'Select Asset from Bynder',
    });

    if (result?.originalUrl) {
      sdk.field.setValue(result);
      setBynderAsset(result);
    } else {
      sdk.notifier.error('No image selected from Bynder.');
    }
  };

  const removeAsset = () => {
    sdk.field.removeValue();
    setBynderAsset(null);
    setAssetMeta(null);
  };

  const openAssetEditor = async (assetId: string) => {
  try {
    await sdk.navigator.openAsset(assetId, {
      slideIn: true,
      waitForClose: true,
    });

    // Optionally refresh the asset info after editing
    fetchAssetMeta(assetId);
  } catch (err) {
    console.error('Failed to open asset editor:', err);
    sdk.notifier.error('Unable to open asset editor.');
  }
};

  const renderImagePreview = (
    src: string | null,
    alt?: string,
    options?: { showReload?: boolean; onReload?: () => void }
  ) => (
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
      {options?.showReload && options?.onReload && (
        <Button
          size="small"
          variant="secondary"
          onClick={options.onReload}
          style={{ marginBottom: '0.5rem' }}
        >
          🔄 Reload
        </Button>
      )}

      {src ? (
        <img
          src={src}
          alt={alt || 'Selected Image'}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
          }}
        />
      ) : (
        <span style={{ fontSize: '13px', color: '#999' }}>
          Untitled Asset
        </span>
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
                Replace image
              </MenuItem>
              <MenuItem onClick={() => { setIsMenuOpen(false); removeAsset(); }}>
                Remove image
              </MenuItem>
              {assetMeta?.id && (
                <MenuItem
                  onClick={() => {
                    setIsMenuOpen(false);
                    openAssetEditor(assetMeta.id);
                  }}
                >
                  Edit image
                </MenuItem>
              )}
            </Menu>
          </Popover.Content>
        </Popover>
      </div>
    </div>
  );


  return (
    <div style={{ padding: 0, margin: 0, width: 'auto', overflow: 'visible' }}>
      {!assetMeta && !bynderAsset && !loading && (
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '0.5rem' }}>
            No media selected
          </p>
          <Stack spacing="spacingS" alignItems="center" flexDirection="row" justifyContent="center">
            <Button size="small" onClick={openEntrySelector}>Add existing media</Button>
            <Button size="small" onClick={openNewAsset}>Add new media</Button>
            <Button size="small" onClick={openBynderDialog}>Import from Bynder</Button>
          </Stack>
        </div>
      )}

      {loading && <Spinner size="large" style={{ marginTop: '1rem' }} />}

      {assetMeta?.url ? renderImagePreview(assetMeta.url, assetMeta.title): null}
      {assetMeta && !assetMeta.url &&
        renderImagePreview(null, assetMeta.title, {
          showReload: true,
          onReload: () => fetchAssetMeta(assetMeta.id),
        })
      }
      {/* {assetMeta && renderImagePreview(assetMeta.url || '', assetMeta.title)} */}
      {bynderAsset?.thumbnail && renderImagePreview(bynderAsset.thumbnail, bynderAsset.name)}
    </div>
  );
};

export default App;
