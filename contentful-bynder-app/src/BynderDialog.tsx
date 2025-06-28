import { useEffect, useState, useRef } from 'react';
import { TextInput, Button } from '@contentful/f36-components';
import { useSDK } from '@contentful/react-apps-toolkit';
import type { DialogAppSDK } from '@contentful/app-sdk';

const PAGE_SIZE = 30;

const BynderDialog = () => {
  const sdk = useSDK<DialogAppSDK>();
  const token = sdk.parameters.instance.bynderToken;
  const domain = sdk.parameters.instance.bynderDomain;

  const [query, setQuery] = useState('');
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  const fetchImages = async (search = '', offsetStart = 0) => {
    setLoading(true);
    try {
      const searchParam = search ? `&name=${encodeURIComponent(search)}` : '';
      const response = await fetch(
        `${domain}/api/v4/media/?limit=${PAGE_SIZE}&offset=${offsetStart}${searchParam}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      const newImages = Array.isArray(data) ? data : [];

      setImages((prev) => [...prev, ...newImages]);
      setOffset(offsetStart + PAGE_SIZE);
      if (newImages.length < PAGE_SIZE) {
        setHasMore(false);
      }
    } catch (e) {
      console.error('❌ Error fetching Bynder assets:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  // Infinite scroll logic
  useEffect(() => {
    const handleScroll = () => {
      const container = listRef.current;
      if (!container || loading || !hasMore) return;

      const { scrollTop, scrollHeight, clientHeight } = container;
      console.log('[scroll]', { scrollTop, scrollHeight, clientHeight });

      if (scrollTop + clientHeight >= scrollHeight - 100) {
        fetchImages(query, offset);
      }
    };

    const container = listRef.current;
    if (container) container.addEventListener('scroll', handleScroll);
    return () => {
      if (container) container.removeEventListener('scroll', handleScroll);
    };
  }, [loading, hasMore, offset, query]);

  const handleSearch = () => {
    setImages([]);
    setOffset(0);
    setHasMore(true);
    fetchImages(query, 0);
  };

  const selectImage = (img: any) => {
    sdk.close({
      id: img.id,
      name: img.name,
      originalUrl: img.originalUrl || img.original?.url,
      thumbnail: img.thumbnail || img.thumbnails?.webimage,
    });
  };

  return (
    <div style={{ padding: 16, height: '600px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 12, display: 'flex' }}>
        <TextInput
          placeholder="Search images..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button onClick={handleSearch} style={{ marginLeft: 8 }}>Search</Button>
      </div>

      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          border: '1px solid #ccc',
          borderRadius: 4,
          padding: 8,
          height: '100%',
          minHeight: 200,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: '12px',
          }}
        >
          {images.map((img, i) => (
            <div
              key={img.id || i}
              onClick={() => selectImage(img)}
              style={{
                cursor: 'pointer',
                border: '1px solid #e2e2e2',
                borderRadius: '6px',
                padding: '6px',
                textAlign: 'center',
                backgroundColor: '#fff',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = '0 0 4px rgba(0, 153, 255, 0.4)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
              }}
            >
              <img
                src={img.thumbnail || img.thumbnails?.webimage}
                alt={img.name}
                style={{
                  width: '100%',
                  height: '80px',
                  objectFit: 'cover',
                  borderRadius: '4px',
                  marginBottom: '6px',
                }}
              />
              <div
                style={{
                  fontSize: '12px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={img.name}
              >
                {img.name}
              </div>
            </div>
          ))}
        </div>

        {loading && <div style={{ padding: 12, textAlign: 'center' }}>Loading...</div>}
        {!loading && !hasMore && images.length > 0 && (
          <div style={{ padding: 12, textAlign: 'center', color: '#999' }}>No more images</div>
        )}
      </div>
    </div>
  );
};

export default BynderDialog;
