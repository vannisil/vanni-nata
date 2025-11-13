// File: api/todos.js
// Questo è il tuo backend Serverless per Vercel
const { MongoClient, ObjectId } = require('mongodb');

// **IMPORTANTE**: SOSTITUISCI QUESTA VARIABILE CON UNA VARIABILE D'AMBIENTE SU VERCEL!
// PER ORA LA INSERIAMO QUI PER POTER TESTARE, MA NON É IL METODO PIÚ SICURO.
const uri = "mongodb+srv://admin:dXUNqQennGmRDcEY@cluster0.b7zcmka.mongodb.net/?appName=Cluster0";
const dbName = 'discourses_db';
const collectionName = 'discorsi';

let cachedDb = null;

// Funzione per connettersi a MongoDB (pattern Serverless per riuso)
async function connectToDatabase() {
    if (cachedDb) {
        return cachedDb;
    }

    const client = await MongoClient.connect(uri);
    const db = client.db(dbName);
    cachedDb = db;
    return db;
}

// Handler principale della funzione Serverless
module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Permette le chiamate dal tuo frontend
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Gestisce le richieste preflight di OPTIONS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const db = await connectToDatabase();
    const collection = db.collection(collectionName);
    const { method, query } = req;
    const todoId = query.id;

    try {
        switch (method) {
            case 'GET': // Legge tutti gli elementi
                const todos = await collection.find({}).sort({ completed: 1, _id: -1 }).toArray();
                return res.status(200).json(todos);

            case 'POST': // Crea un nuovo elemento
                const { text } = req.body;
                if (!text) {
                    return res.status(400).json({ error: 'Testo mancante' });
                }
                const newTodo = { text, completed: false, createdAt: new Date() };
                await collection.insertOne(newTodo);
                return res.status(201).json(newTodo);

            case 'PUT': // Aggiorna lo stato (toggle)
                if (!todoId) {
                    return res.status(400).json({ error: 'ID mancante' });
                }
                const todoToUpdate = await collection.findOne({ _id: new ObjectId(todoId) });
                if (!todoToUpdate) {
                    return res.status(404).json({ error: 'To-do non trovato' });
                }
                const resultUpdate = await collection.updateOne(
                    { _id: new ObjectId(todoId) },
                    { $set: { completed: !todoToUpdate.completed } }
                );
                return res.status(200).json(resultUpdate);

            case 'DELETE': // Elimina un elemento
                if (!todoId) {
                    return res.status(400).json({ error: 'ID mancante' });
                }
                const resultDelete = await collection.deleteOne({ _id: new ObjectId(todoId) });
                if (resultDelete.deletedCount === 0) {
                    return res.status(404).json({ error: 'To-do non trovato' });
                }
                return res.status(200).json({ message: 'Eliminato con successo' });

            default:
                res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
                return res.status(405).end(`Method ${method} Not Allowed`);
        }
    } catch (error) {
        console.error("Errore del Serverless:", error);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
};
