import type { User, CreateUserDTO, UpdateUserDTO } from "../types/User.js"
import { db } from "../config/firebase.js"
import { notifyWithAdmins } from "../utils/notificationHelper.js"

const collection = db.collection("users")

export class UserModel {
  // --- Create User ---
  static async create(data: CreateUserDTO): Promise<User> {
    if (!data.address) {
      throw new Error("Missing required field: address")
    }

    const docRef = collection.doc(data.address)
    const doc = await docRef.get()
    if (doc.exists) throw new Error(`User with address ${data.address} already exists`)

    const newUser: User = {
      address: data.address,
      role: data.role ?? "user",
      metadata: data.metadata ?? {},
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    }
    
    await notifyWithAdmins(data.address, {
      type: "user",
      title: `User Created: ${data.address}`,
      message: `User with address ${data.address} created by ${data.address}.`,
    })

    await docRef.set(newUser)
    return newUser
  }

  // --- Get All Users ---
  static async getAll(): Promise<User[]> {
    const snapshot = await collection.get()
    return snapshot.docs.map((doc) => doc.data() as User)
  }

  // --- Get by Address ---
  static async getByAddress(address: string): Promise<User | null> {
    const doc = await collection.doc(address).get()
    if (!doc.exists) return null
    return doc.data() as User
  }

  // --- Update User ---
  static async update(address: string, data: UpdateUserDTO): Promise<User | null> {
    const docRef = collection.doc(address)
    const snapshot = await docRef.get()
    if (!snapshot.exists) return null

    const updateData: Partial<User> = {
      ...data,
      ...(data.metadata ? { metadata: { ...snapshot.data()?.metadata, ...data.metadata } } : {}),
      lastLoginAt: data.lastLoginAt ?? snapshot.data()?.lastLoginAt ?? Date.now(),
    }

    await docRef.update(updateData)
    const updatedDoc = await docRef.get()
    return updatedDoc.data() as User
  }

  // --- Delete User ---
  static async delete(address: string): Promise<boolean> {
    const docRef = collection.doc(address)
    const snapshot = await docRef.get()
    if (!snapshot.exists) return false

    await docRef.delete()
    return true
  }
}
