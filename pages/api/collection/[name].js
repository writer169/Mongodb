import { MongoClient } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { key, name, limit = 10, skip = 0, database } = req.query;
  
  if (key !== process.env.ACCESS_KEY) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    
    // Используем указанную базу данных или берем из URI
    const db = database ? client.db(database) : client.db();
    const collection = db.collection(name);
    
    const documents = await collection
      .find({})
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .toArray();
    
    const totalCount = await collection.countDocuments();

    res.status(200).json({
      collection: name,
      database: db.databaseName,
      totalCount,
      documents: documents.map(doc => ({
        ...doc,
        _id: doc._id.toString() // Конвертируем ObjectId в строку
      }))
    });
  } catch (error) {
    console.error('Error fetching collection data:', error);
    res.status(500).json({ 
      message: 'Failed to fetch collection data',
      error: error.message 
    });
  } finally {
    await client.close();
  }
}