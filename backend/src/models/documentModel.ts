import { db } from "../config/firebase.js"
import DocumentDTO from "../dtos/documentDTO.js"
import type { Document } from "../types/Document.js"

const collection = db.collection("documents")

// --- Tambah dokumen baru
export const addDocument = async (data: Partial<Document>) => {
  const dto = new DocumentDTO(data)

  const docRef = collection.doc(dto.tokenId.toString())
  const doc = await docRef.get()

  if (doc.exists) {
    throw new Error(`Document with tokenId ${dto.tokenId} already exists`)
  }

  const newDoc: Document = dto.toFirestore()
  await docRef.set(newDoc)

  return newDoc
}

// --- Ambil dokumen by tokenId
export const getDocumentById = async (tokenId: number) => {
  const doc = await collection.doc(tokenId.toString()).get()
  return doc.exists ? (doc.data() as Document) : null
}

// --- Ambil semua dokumen
export const getAllDocuments = async () => {
  const snapshot = await collection.get()
  return snapshot.docs.map((doc) => doc.data() as Document)
}

// --- Ambil dokumen by owner
export const getDocumentsByOwner = async (owner: string) => {
  const snapshot = await collection.where("owner", "==", owner.toLowerCase()).get()
  return snapshot.docs.map((doc) => doc.data() as Document)
}

// --- Ambil dokumen by kontrak trade
export const getDocumentsByContract = async (contractAddress: string) => {
  const snapshot = await collection.where("linkedContracts", "array-contains", contractAddress).get()
  return snapshot.docs.map((doc) => doc.data() as Document)
}

// --- Update dokumen
export const updateDocument = async (tokenId: number, data: Partial<Document>) => {
  const docRef = collection.doc(tokenId.toString())
  const doc = await docRef.get()

  if (!doc.exists) return null

  const current = doc.data() as Document
  const updated: Document = {
    ...current,
    ...data,
    updatedAt: Date.now(),
  }

  await docRef.update(updated as any)
  return updated
}

// --- Hapus dokumen
export const deleteDocument = async (tokenId: number) => {
  const docRef = collection.doc(tokenId.toString())
  const doc = await docRef.get()

  if (!doc.exists) return false

  await docRef.delete()
  return true
}
