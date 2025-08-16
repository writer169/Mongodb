import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [databaseName, setDatabaseName] = useState('');
  const router = useRouter();

  const accessKey = router.query.key;

  useEffect(() => {
    if (accessKey) {
      fetchCollections();
    }
  }, [accessKey]);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/collections?key=${accessKey}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch collections');
      }
      
      const data = await response.json();
      setCollections(data.collections);
      setDatabaseName(data.database);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCollectionData = async (collectionName) => {
    try {
      const response = await fetch(`/api/collection/${collectionName}?key=${accessKey}&limit=20`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch collection data');
      }
      
      const data = await response.json();
      setDocuments(data.documents);
      setSelectedCollection(collectionName);
    } catch (err) {
      setError(err.message);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!accessKey) {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <h1>MongoDB Viewer</h1>
        <p>Добавьте параметр ?key=ваш_ключ к URL для доступа</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <h1>Loading...</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <h1>Error</h1>
        <p style={{ color: 'red' }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>MongoDB Viewer - {databaseName}</h1>
      
      {!selectedCollection ? (
        <div>
          <h2>Collections ({collections.length})</h2>
          <div style={{ display: 'grid', gap: '10px' }}>
            {collections.map((collection) => (
              <div
                key={collection.name}
                style={{
                  border: '1px solid #ddd',
                  padding: '15px',
                  borderRadius: '5px',
                  backgroundColor: '#f9f9f9',
                  cursor: 'pointer'
                }}
                onClick={() => fetchCollectionData(collection.name)}
              >
                <h3 style={{ margin: '0 0 10px 0' }}>{collection.name}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', fontSize: '14px' }}>
                  <div><strong>Documents:</strong> {collection.count.toLocaleString()}</div>
                  <div><strong>Size:</strong> {formatBytes(collection.size)}</div>
                  <div><strong>Storage:</strong> {formatBytes(collection.storageSize)}</div>
                  <div><strong>Indexes:</strong> {collection.indexes}</div>
                  {collection.avgObjSize > 0 && (
                    <div><strong>Avg Size:</strong> {formatBytes(collection.avgObjSize)}</div>
                  )}
                </div>
                {collection.error && (
                  <div style={{ color: 'orange', fontSize: '12px', marginTop: '5px' }}>
                    ⚠️ {collection.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <button 
            onClick={() => {setSelectedCollection(null); setDocuments([]);}}
            style={{ marginBottom: '20px', padding: '10px 15px', cursor: 'pointer' }}
          >
            ← Back to Collections
          </button>
          
          <h2>Collection: {selectedCollection}</h2>
          <p>Showing first 20 documents:</p>
          
          {documents.length === 0 ? (
            <p>No documents found</p>
          ) : (
            <div>
              {documents.map((doc, index) => (
                <div
                  key={index}
                  style={{
                    border: '1px solid #ddd',
                    padding: '10px',
                    marginBottom: '10px',
                    backgroundColor: '#f9f9f9',
                    borderRadius: '5px'
                  }}
                >
                  <pre style={{ 
                    whiteSpace: 'pre-wrap', 
                    wordBreak: 'break-word',
                    margin: 0,
                    fontSize: '12px'
                  }}>
                    {JSON.stringify(doc, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}