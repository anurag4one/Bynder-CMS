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
import type { FieldAppSDK } from '@contentful/app-sdk';

const App = () => {
  const sdk = useSDK<FieldAppSDK>();
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
    const currentValue = sdk.field.getValue();
    const assetInfo = currentValue?.en;

    if (assetInfo?.type === 'DAM asset') {
      setBynderAsset(assetInfo);
      setAssetMeta(null);
    } else if (assetInfo?.type === 'CMS asset') {
      setBynderAsset(assetInfo);
      fetchAssetMeta(assetInfo.id);
    }

    const detach = sdk.field.onValueChanged((assetInfo) => {
      const updated = assetInfo?.en;
      if (updated?.type === 'DAM asset') {
        setBynderAsset(updated);
        setAssetMeta(null);
      } else if (updated?.type === 'CMS asset') {
        setBynderAsset(updated);
        fetchAssetMeta(updated.id);
      }
    });

    return () => detach();
  }, []);

  const selectAsset = async (id: string) => {
    try {
      const asset = await sdk.cma.asset.get({ assetId: id });
      const locale = sdk.field.locale;
      const title = asset.fields?.title?.[locale] || 'Untitled';
      const assetInfo = {
        en: {
          type: 'CMS asset',
          id,
          name: title,
        },
      };
      sdk.field.setValue(assetInfo);
    } catch (err) {
      console.error('Failed to fetch selected asset:', err);
    }
  };

  const openEntrySelector = async () => {
    const result = await sdk.dialogs.selectSingleAsset();
    if (result?.sys?.id) {
      selectAsset(result.sys.id);
    }
  };

  const openNewAsset = async () => {
    const result = await sdk.navigator.openNewAsset({ slideIn: true });
    const assetId = result?.entity?.sys?.id;
    if (assetId) {
      selectAsset(assetId);
    }
  };

  const openBynderDialog = async () => {
    const result = await sdk.dialogs.openCurrentApp({
      width: 800,
      minHeight: 600,
      title: 'Select Asset from Brand Portal',
    });

    if (result?.id && result?.thumbnail) {
      const structured = {
        en: {
          type: 'DAM asset',
          name: result.name || 'Untitled',
          id: result.id,
          damAssetUrl: result.originalUrl,
        },
      };
      sdk.field.setValue(structured);
    } else {
      sdk.notifier.error('No image selected from Brand Portal.');
    }
  };

  const removeAsset = () => {
    sdk.field.removeValue();
    setAssetMeta(null);
    setBynderAsset(null);
  };

  const openAssetEditor = async (assetId: string) => {
    try {
      await sdk.navigator.openAsset(assetId, {
        slideIn: true,
        waitForClose: true,
      });
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
                Replace image from Brand Portal
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
          <Stack spacing="spacingS" alignItems="center" flexDirection="row" justifyContent="center">
            <Button size="small" onClick={openEntrySelector}>Add existing media</Button>
            <Button size="small" onClick={openNewAsset}>Add new media</Button>
            <Button size="small" onClick={openBynderDialog}>Import from Brand Portal</Button>
          </Stack>
        </div>
      )}

      {loading && <Spinner size="large" style={{ marginTop: '1rem' }} />}

      {bynderAsset?.type === 'DAM asset' && renderImagePreview(bynderAsset.damAssetUrl, bynderAsset.name)}

      {bynderAsset?.type === 'CMS asset' && assetMeta?.url && renderImagePreview(assetMeta.url, bynderAsset.name)}

      {bynderAsset?.type === 'CMS asset' && assetMeta && !assetMeta.url &&
        renderImagePreview(null, bynderAsset.name, {
          showReload: true,
          onReload: () => fetchAssetMeta(assetMeta.id),
        })}
    </div>
  );
};

export default App;
