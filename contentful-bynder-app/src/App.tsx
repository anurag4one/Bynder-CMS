import {
  useSDK,
  useFieldValue,
} from '@contentful/react-apps-toolkit';
import {
  Menu,
  MenuItem,
  Button,
  Popover,
  Text,
  Spinner,
} from '@contentful/f36-components';
import { useRef, useState, useEffect } from 'react';
import type { FieldAppSDK, Link, Asset } from '@contentful/app-sdk';

const App = () => {
  const sdk = useSDK<FieldAppSDK>();
  const [assetLink, setAssetLink] = useFieldValue<Link>();
  type AssetMeta = {
    id: string;
    thumbnailUrl: string;
  };
  const [assetMeta, setAssetMeta] = useState<AssetMeta | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const fetchAssetMeta = async (id: string) => {
    try {
      setLoading(true);
      const asset = await sdk.cma.asset.get({ assetId: id });
      const locale = sdk.field.locale;
      const file = asset.fields.file?.[locale];

      if (file?.url) {
        setAssetMeta({
          id,
          thumbnailUrl: `https:${file.url}?w=300&h=200&fit=thumb`,
        });
      } else {
        setAssetMeta(null);
      }
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
      selectAsset(result.sys.id);
    }
  };

  let assetCreationInitiated = false;

  const openNewAsset = async () => {
    const result = await sdk.navigator.openNewAsset({ slideIn: true });
    if (!result?.entity?.sys?.id) return;

    const assetId = result.entity.sys.id;
    assetCreationInitiated = true;

    try {
      let asset;
      let retries = 10;

      while (retries > 0) {
        asset = await sdk.cma.asset.get({ assetId });
        const file = asset.fields?.file?.['en'];
        const isUploaded = !!file?.url;
        const isPublished = !!asset.sys.publishedVersion;

        if (isUploaded && isPublished) break;
        await new Promise((res) => setTimeout(res, 1000));
        retries--;
      }

      if (!asset) return;

      const link: Link = {
        sys: {
          type: 'Link',
          linkType: 'Asset',
          id: assetId,
        },
      };

      await sdk.field.setValue(link);
      setAssetLink(link);
      await fetchAssetMeta(assetId);
    } catch (err) {
      console.error('[NewAsset] Failed:', err);
    }
  };

  if (assetCreationInitiated) {
    location.reload();
  }

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

  const [bynderAsset, setBynderAsset] = useState<any>(null);

  useEffect(() => {
    const currentValue = sdk.field.getValue();
    setBynderAsset(currentValue);

    const detach = sdk.field.onValueChanged((newValue) => {
      setBynderAsset(newValue);
    });

    return () => detach(); // clean up listener on unmount
  }, []);

  const clearBynder = () => {
    sdk.field.removeValue();
    setBynderAsset(null);
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
        height: '80vh',
        flexDirection: 'column',
      }}
    >
      {!assetMeta && !bynderAsset && (
        <Popover isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} placement="bottom-start">
          <Popover.Trigger>
            <Button
              variant="secondary"
              onClick={() => setIsMenuOpen((open) => !open)}
              ref={buttonRef}
            >
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
      )}

      {loading && <Spinner size="large" style={{ marginTop: '1rem' }} />}

      {assetMeta && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img
            src={assetMeta.thumbnailUrl}
            alt="Asset"
            style={{ maxWidth: '300px', maxHeight: '200px', marginBottom: '0.5rem' }}
          />
          <Button
            variant="negative"
            size="small"
            onClick={() => {
              sdk.field.removeValue();
              setAssetMeta(null);
            }}>
            Remove media
          </Button>
        </div>
      )}

      {bynderAsset?.thumbnail && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img
            src={bynderAsset.thumbnail}
            alt={bynderAsset.name}
            style={{ maxWidth: '300px', maxHeight: '200px', marginBottom: '0.5rem' }}
          />
          <p style={{ fontSize: 14 }}>{bynderAsset.name}</p>
          <Button variant="secondary" onClick={openBynderDialog} style={{ marginBottom: 8 }}>
            Replace Bynder Image
          </Button>
          <Button variant="negative" onClick={clearBynder}>
            Remove Bynder Image
          </Button>
        </div>
      )}
    </div>
  );
};

export default App;
