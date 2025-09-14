import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import morgan from 'morgan'
import contractRoutes from './routes/contractRoutes.js'
import walletRoutes from './routes/walletRoutes.js'
import nftRoutes from './routes/nftRoutes.js'
import companyRoutes from './routes/companyRoutes.js'
import documentRoutes from './routes/documentRoutes.js'
import activityRoutes from './routes/activityRoutes.js'
import aggregatedActivityRoutes from './routes/aggregatedActivityRoutes.js'

dotenv.config()

const app = express()

// Middleware
app.use(cors())
app.use(express.json())
app.use(morgan('dev'))

// Routes
app.get('/', (req, res) => res.send('Backend is running'))

app.use('/api/contract', contractRoutes)
app.use('/api/wallet', walletRoutes)
app.use('/api/nft', nftRoutes)
app.use('/api/company', companyRoutes)
app.use('/api/document', documentRoutes)
app.use('/api/activity', activityRoutes);
app.use('/api/aggregated', aggregatedActivityRoutes);

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
})