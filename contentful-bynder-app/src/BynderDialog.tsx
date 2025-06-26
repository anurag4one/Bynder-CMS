import React, { useState } from 'react';
import { useSDK } from '@contentful/react-apps-toolkit';
import type { DialogAppSDK } from '@contentful/app-sdk';

export default function BynderDialog() {
  const sdk = useSDK<DialogAppSDK>();
  const [searchTerm, setSearchTerm] = useState('');
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const token = sdk.parameters.instance.bynderToken;
  const domain = sdk.parameters.instance.bynderDomain;

  const handleSearch = async () => {
    console.log('🔍 Searching Bynder with:', { token, domain, searchTerm });

    setLoading(true);
    try {
      const res = await fetch(
        `${domain}/api/v4/media/?keyword=${encodeURIComponent(searchTerm)}&type=image&limit=20`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log('🌐 Response status:', res.status);
      console.log('🌐 Response:', res);
      if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ Search failed:', errorText);
        return;
      }

      const rawData = await res.json();
      console.log('✅ Raw data:', rawData);

      const parsedImages = rawData.map((item: any) => ({
        id: item.id,
        name: item.name,
        thumbnail:
          item.thumbnails?.webimage ||
          item.derivatives?.webImage?.url ||
          '',
        originalUrl: item.originalUrl || '',
      }));

      console.log('🖼️ Parsed images:', parsedImages);
      setImages(parsedImages);
    } catch (err) {
      console.error('🛑 Error during search:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (img: any) => {
    console.log('📌 Selected media ID:', img.id);
    sdk.close({
      id: img.id,
      name: img.name,
      originalUrl: img.originalUrl,
      thumbnail: img.thumbnail,
    });
  };


  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          placeholder="Search images..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, padding: '8px', fontSize: '16px' }}
        />
        <button onClick={handleSearch} disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: 12,
          marginTop: 20,
        }}
      >
        {!loading && searchTerm.trim() !== '' && images.length === 0 && (
          <p style={{ gridColumn: '1 / -1', textAlign: 'center' }}>No results found</p>
        )}
        {images.map((img) => (
          <img
            key={img.id}
            src={
              img.thumbnail ||
              'https://via.placeholder.com/150?text=No+Thumbnail'
            }
            alt={img.name}
            style={{
              width: '100%',
              cursor: 'pointer',
              borderRadius: 8,
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            }}
            onClick={() => handleSelect(img)}
          />
        ))}
      </div>
    </div>
  );
}
