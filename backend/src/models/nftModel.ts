import { db } from "../config/firebase.js"
import NFTDTO from "../dtos/nftDTO.js"
import type { NFT } from "../types/NFT.js"

const collection = db.collection("nfts")

export const addNFT = async (data: Partial<NFT>) => {
  const dto = new NFTDTO(data)

  const docRef = collection.doc(dto.tokenId)
  const doc = await docRef.get()

  if (doc.exists) {
    throw new Error(`NFT with tokenId ${dto.tokenId} already exists`)
  }

  const newDoc: NFT = dto.toFirestore()
  await docRef.set(newDoc)

  return newDoc
}

export const getNFTById = async (tokenId: string) => {
  const doc = await collection.doc(tokenId).get()
  return doc.exists ? (doc.data() as NFT) : null
}

export const getAllNFTs = async () => {
  const snapshot = await collection.get()
  return snapshot.docs.map((doc) => doc.data() as NFT)
}

export const getNFTsByOwner = async (owner: string) => {
  const snapshot = await collection.where("owner", "==", owner.toLowerCase()).get()
  return snapshot.docs.map((doc) => doc.data() as NFT)
}

export const updateNFT = async (tokenId: string, data: Partial<NFT>) => {
  const docRef = collection.doc(tokenId)
  const doc = await docRef.get()

  if (!doc.exists) return null

  const current = doc.data() as NFT
  const updated: NFT = {
    ...current,
    ...data,
    updatedAt: Date.now(),
  }

  await docRef.update(updated as any)
  return updated
}

export const deleteNFT = async (tokenId: string) => {
  const docRef = collection.doc(tokenId)
  const doc = await docRef.get()

  if (!doc.exists) return false

  await docRef.delete()
  return true
}
