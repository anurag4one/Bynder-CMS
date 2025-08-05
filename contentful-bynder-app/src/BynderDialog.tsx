import { useEffect, useState, useRef } from 'react';
import { TextInput, Button } from '@contentful/f36-components';
import { useSDK } from '@contentful/react-apps-toolkit';
import type { DialogAppSDK } from '@contentful/app-sdk';

const PAGE_SIZE = 30;

const BynderDialog = () => {
  const sdk = useSDK<DialogAppSDK>();
  const token = sdk.parameters.instance.bynderToken;
  const domain = sdk.parameters.instance.bynderDomain;
  const [errorMessage, setErrorMessage] = useState('');

  const [query, setQuery] = useState('');
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  const fetchImages = async (search = '', pageNum = 1, shouldAppend = true) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const searchParam = search ? `&keyword=${encodeURIComponent(search)}` : '';
      const response = await fetch(
        `${domain}/api/v4/media/?type=image&page=${pageNum}&limit=${PAGE_SIZE}${searchParam}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          sdk.notifier.error("Authentication failed. Please check your connection or contact support.");
        } else if (response.status === 429) {
          sdk.notifier.error("Too many requests. Please wait for 5 minutes and try again.");
        } else if (response.status >= 500) {
          sdk.notifier.error("Unable to fetch assets right now. Please try again shortly or contact CMS admin to process your request.");
        } else {
          sdk.notifier.error("An unexpected error occurred while fetching assets.");
        }
    }

      const data = await response.json();
      const newImages = Array.isArray(data) ? data : [];

      if (shouldAppend) {
        setImages((prev) => [...prev, ...newImages]);
      } else {
        setImages(newImages);
      }
      
      // Update page for next fetch
      setPage(pageNum + 1);
      
      // Check if we have more data
      setHasMore(newImages.length === PAGE_SIZE);
      
    } catch (err: any) {
      console.error('❌ Error fetching Bynder assets:', err);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchImages('', 1, false);
  }, []);

  // Scroll handler for pagination
  useEffect(() => {
    const handleScroll = () => {
      const container = listRef.current;
      if (!container || loading || !hasMore) return;

      const { scrollTop, scrollHeight, clientHeight } = container;
      // Trigger when user is near bottom (100px threshold)
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        fetchImages(query, page, true);
      }
    };

    const container = listRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [loading, hasMore, page, query]);

  const handleSearch = () => {
    setImages([]);
    setPage(1);
    setHasMore(true);
    fetchImages(query, 1, false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const selectImage = (img: any) => {
    const thumbnail = img.thumbnail || img.thumbnails?.webimage;
    const originalUrl = thumbnail;

    sdk.close({
      type: 'bynder',
      title: img.name || 'Untitled',
      thumbnail,
      originalUrl,
    });
  };

  return (
    <div style={{ padding: 16, height: '600px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 12, display: 'flex' }}>
        <TextInput
          placeholder="Search images..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <Button onClick={handleSearch} style={{ marginLeft: 8 }}>
          Search
        </Button>
      </div>

      {errorMessage && (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#fdecea',
      color: '#b71c1c',
      padding: '10px 14px',
      borderRadius: '6px',
      border: '1px solid #f5c6cb',
      marginBottom: '12px',
      fontSize: '14px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    }}
  >
    <span>{errorMessage}</span>
  </div>
)}

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
        {images.length === 0 && !loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
            {query ? 'No matches found! Search for something else.' : 'No images available.'}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: '12px',
            }}
          >
            {images.map((img, i) => (
              <div
                key={`${img.id || i}-${page}`} // Better key to avoid duplicates
                onClick={() => selectImage(img)}
                style={{
                  cursor: 'pointer',
                  border: '1px solid #e2e2e2',
                  borderRadius: '6px',
                  padding: '6px',
                  textAlign: 'center',
                  backgroundColor: '#fff',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  transition: 'box-shadow 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 4px rgba(0, 153, 255, 0.4)';
                }}
                onMouseLeave={(e) => {
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
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
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
        )}

        {loading && (
          <div style={{ padding: 12, textAlign: 'center' }}>
            {images.length === 0 ? 'Loading images...' : 'Loading more images...'}
          </div>
        )}
        
        {!loading && !hasMore && images.length > 0 && (
          <div style={{ padding: 12, textAlign: 'center', color: '#999' }}>
            No more images to load
          </div>
        )}
      </div>
    </div>
  );
};

export default BynderDialog;