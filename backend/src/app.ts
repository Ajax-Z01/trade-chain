import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import admin from 'firebase-admin'
import path from 'path'
import morgan from 'morgan'

dotenv.config()

const serviceAccountPath = path.resolve('./src/firebaseServiceAccount.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountPath)
})

const db = admin.firestore()
const app = express()

// Middleware
app.use(cors())
app.use(express.json())
app.use(morgan('dev'))

// Routes
app.get('/', (req, res) => res.send('Backend is running'))

app.get('/contracts', async (req, res) => {
  try {
    const snapshot = await db.collection('contracts').get()
    const contracts: any[] = []
    snapshot.forEach(doc => contracts.push({ id: doc.id, ...doc.data() }))
    res.json(contracts)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch contracts' })
  }
})

const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
