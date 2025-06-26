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
    setAssetLink(link);
    fetchAssetMeta(id);
  };

  const openEntrySelector = async () => {
    const result = await sdk.dialogs.selectSingleAsset();
    if (result?.sys?.id) {
      selectAsset(result.sys.id);
    }
  };

  const openNewAsset = async () => {
    console.log('Opening new asset slide-in...');
    const result = await sdk.navigator.openNewAsset({ slideIn: true });

    if (!result?.entity?.sys?.id) {
      console.log('No asset was created.');
      return;
    }

    const assetId = result?.entity?.sys?.id;
    console.log('[NewAsset] Created asset ID:', assetId); 

    try {
    // ⏳ Wait for asset to be fully processed and published
    let asset;
    let retries = 10;

    while (retries > 0) {
      asset = await sdk.space.getAsset(assetId);

      const file = asset.fields?.file?.['en'];
      const isUploaded = !!file?.url;
      const isPublished = !!asset.sys.publishedVersion;

      console.log(`[Polling] Uploaded: ${isUploaded}, Published: ${isPublished}`);

      if (isUploaded && isPublished) {
        break;
      }

      await new Promise((res) => setTimeout(res, 1000));
      retries--;
    }

    if (!asset) {
      console.warn('[NewAsset] Asset not found or not ready.');
      return;
    }

    // ✅ Now assign to field
    const link: Link = {
      sys: {
        type: 'Link',
        linkType: 'Asset',
        id: assetId,
      },
    };

    console.log('[NewAsset] Setting field value:', link);
    sdk.field.setValue(link); // 🔥 This is key!

    // Optional: update local preview (UI)
    setAssetLink(link);
    await fetchAssetMeta(assetId);

    } catch (err) {
    console.error('[NewAsset] Failed:', err);
    }
  };

  const openBynderDialog = async () => {
    const result = await sdk.dialogs.openCurrentApp({
      width: 800,
      minHeight: 600,
      title: 'Select Asset from Bynder',
    });

    if (result && result.id) {
      console.log('📦 Received Bynder asset:', result); // Logs ID, name, originalUrl, etc.
      
      // 🚧 Next step: Use `result.originalUrl` with Bynder's download API
      // const createdAssetId = await createAssetFromBynder(result);
      // selectAsset(createdAssetId);
    }
  };

  // 🔧 Stub: Replace this with actual Bynder import logic if you already have one
  const createAssetFromBynder = async (imageUrl: string): Promise<string> => {
    // TEMP: just logs and throws
    console.warn('⚠️ Implement logic to upload Bynder image to Contentful:', imageUrl);
    throw new Error('createAssetFromBynder not implemented');
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
    {!assetMeta && (  <Popover isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} placement="bottom-start">
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
    </div>
  );
};

export default App;
