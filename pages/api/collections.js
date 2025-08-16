import { MongoClient } from 'mongodb';

export default async function handler(req, res) {
  // Проверяем метод запроса
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Проверяем ключ доступа
  const { key } = req.query;
  if (key !== process.env.ACCESS_KEY) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db();
    
    // Получаем список коллекций
    const collections = await db.listCollections().toArray();
    
    // Получаем размер каждой коллекции
    const collectionsWithStats = await Promise.all(
      collections.map(async (collection) => {
        try {
          const stats = await db.collection(collection.name).stats();
          const count = await db.collection(collection.name).countDocuments();
          
          return {
            name: collection.name,
            type: collection.type,
            count: count,
            size: stats.size || 0,
            storageSize: stats.storageSize || 0,
            avgObjSize: stats.avgObjSize || 0,
            indexes: stats.nindexes || 0
          };
        } catch (error) {
          // Если не удается получить статистику, возвращаем базовую информацию
          const count = await db.collection(collection.name).countDocuments();
          return {
            name: collection.name,
            type: collection.type,
            count: count,
            size: 0,
            storageSize: 0,
            avgObjSize: 0,
            indexes: 0,
            error: 'Could not fetch stats'
          };
        }
      })
    );

    res.status(200).json({
      database: db.databaseName,
      collections: collectionsWithStats
    });
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