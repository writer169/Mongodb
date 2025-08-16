import { MongoClient } from 'mongodb';

export default async function handler(req, res) {
  // Проверяем метод запроса
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Проверяем ключ доступа
  const { key, database } = req.query;
  if (key !== process.env.ACCESS_KEY) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    
    // Если передана конкретная база данных, используем её, иначе получаем список всех баз
    if (database) {
      const db = client.db(database);
      const collections = await db.listCollections().toArray();
      
      // Получаем информацию о каждой коллекции
      const collectionsWithStats = await Promise.all(
        collections.map(async (collection) => {
          try {
            const count = await db.collection(collection.name).countDocuments();
            
            // Пытаемся получить статистику, но не падаем если не получается
            let stats = null;
            try {
              stats = await db.collection(collection.name).stats();
            } catch (statsError) {
              console.log(`Could not get stats for ${collection.name}:`, statsError.message);
            }
            
            // Пытаемся получить информацию об индексах
            let indexCount = 0;
            try {
              const indexes = await db.collection(collection.name).indexes();
              indexCount = indexes.length;
            } catch (indexError) {
              console.log(`Could not get indexes for ${collection.name}:`, indexError.message);
            }
            
            return {
              name: collection.name,
              type: collection.type || 'collection',
              count: count,
              size: stats?.size || 0,
              storageSize: stats?.storageSize || 0,
              avgObjSize: stats?.avgObjSize || 0,
              indexes: stats?.nindexes || indexCount,
              hasStats: !!stats
            };
          } catch (error) {
            console.error(`Error processing collection ${collection.name}:`, error);
            return {
              name: collection.name,
              type: collection.type || 'collection',
              count: 0,
              size: 0,
              storageSize: 0,
              avgObjSize: 0,
              indexes: 0,
              error: 'Could not fetch collection info',
              hasStats: false
            };
          }
        })
      );

      res.status(200).json({
        database: db.databaseName,
        collections: collectionsWithStats
      });
    } else {
      // Получаем список всех баз данных
      const adminDb = client.db().admin();
      const databases = await adminDb.listDatabases();
      
      res.status(200).json({
        databases: databases.databases.filter(db => 
          !['admin', 'local', 'config'].includes(db.name)
        )
      });
    }
  } catch (error) {
    console.error('MongoDB connection error:', error);
    res.status(500).json({ 
      message: 'Failed to connect to database',
      error: error.message 
    });
  } finally {
    await client.close();
  }
}