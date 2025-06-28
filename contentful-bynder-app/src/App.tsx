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

  const fetchAssetMeta = async (id: string) => {
    try {
      setLoading(true);
      const asset = await sdk.cma.asset.get({ assetId: id });
      const locale = sdk.field.locale;
      const file = asset.fields.file?.[locale];

      if (file?.url) {
        setAssetMeta({
          id,
          url: `https:${file.url}`,
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
      selectAsset(result.sys.id);
    }
  };

  const openNewAsset = async () => {
    const result = await sdk.navigator.openNewAsset({ slideIn: true });
    if (!result?.entity?.sys?.id) return;

    const assetId = result.entity.sys.id;
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

  const renderImagePreview = (src: string, alt?: string) => (
    <div style={{ width: '100%', textAlign: 'center', position: 'relative' }}>
      <img
        src={src}
        alt={alt || 'Selected Image'}
        style={{
          maxWidth: '100%',
          height: 'auto',
          borderRadius: '8px',
          marginBottom: '0.5rem',
        }}
        onLoad={() => sdk.window.updateHeight()}
      />

      <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
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
            </Menu>
          </Popover.Content>
        </Popover>
      </div>
    </div>
  );

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        padding: '1rem',
        border: '2px dashed #ccc',
        borderRadius: '12px',
        alignItems: 'center',
        flexDirection: 'column',
        width: '100%',
      }}
    >
      {!assetMeta && !bynderAsset && (
        <Popover
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          placement="bottom-start"
        >
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

      {assetMeta?.url && renderImagePreview(assetMeta.url)}
      {bynderAsset?.thumbnail && renderImagePreview(bynderAsset.thumbnail, bynderAsset.name)}
    </div>
  );
};

export default App;
