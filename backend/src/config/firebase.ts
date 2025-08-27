import admin from 'firebase-admin'
import path from 'path'

const serviceAccountPath = path.resolve('./src/firebaseServiceAccount.json')

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
  })
}

export const db = admin.firestore()
export default admin
