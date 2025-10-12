import type {
  UserCompany,
  CreateUserCompanyDTO,
  UpdateUserCompanyDTO,
} from "../types/UserCompany.js"
import { db } from "../config/firebase.js"

const collection = db.collection("userCompanies")

interface GetAllFilteredParams {
  page: number
  limit: number
  search?: string
  role?: string
  status?: string
}

export class UserCompanyModel {
  // --- Create Relation (alias createUserCompany) ---
  static async createUserCompany(data: CreateUserCompanyDTO): Promise<UserCompany> {
    if (!data.userAddress) throw new Error("Missing required field: userAddress")
    if (!data.companyId) throw new Error("Missing required field: companyId")

    // Cek apakah relasi sudah ada
    const existingSnap = await collection
      .where("userAddress", "==", data.userAddress)
      .where("companyId", "==", data.companyId)
      .limit(1)
      .get()

    if (!existingSnap.empty) {
      throw new Error(`Relation between user ${data.userAddress} and company ${data.companyId} already exists`)
    }

    const newRelation: Omit<UserCompany, "id"> = {
      userAddress: data.userAddress,
      companyId: data.companyId,
      role: data.role ?? "staff",
      status: data.status ?? "pending",
      joinedAt: data.joinedAt ?? Date.now(),
      txHash: data.txHash,
      onchainJoinedAt: data.onchainJoinedAt,
    }

    const docRef = await collection.add(newRelation)
    return { id: docRef.id, ...newRelation }
  }

  // --- Get All Filtered with pagination ---
  static async getAllFiltered(params: GetAllFilteredParams): Promise<{ data: UserCompany[]; total: number }> {
    const { page, limit, search, role, status } = params

    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = collection

    // Apply filters
    if (search) {
      // Firestore tidak bisa partial search, kita pakai '>=', '<=' trick untuk string prefix
      query = query.where('userAddress', '>=', search).where('userAddress', '<=', search + '\uf8ff')
    }
    if (role) query = query.where('role', '==', role)
    if (status) query = query.where('status', '==', status)

    // Untuk pagination kita pakai offset
    const snapshot = await query
      .orderBy('joinedAt', 'desc')
      .offset((page - 1) * limit)
      .limit(limit)
      .get()

    const data: UserCompany[] = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as UserCompany))

    // Hitung total (filter tanpa pagination)
    const totalSnap = await query.get()
    const total = totalSnap.size

    return { data, total }
  }

  // --- Get By ID ---
  static async getById(id: string): Promise<UserCompany | null> {
    const doc = await collection.doc(id).get()
    if (!doc.exists) return null
    return { id: doc.id, ...doc.data() } as UserCompany
  }

  // --- Get By User ---
  static async getByUser(userAddress: string): Promise<UserCompany[]> {
    const snapshot = await collection.where("userAddress", "==", userAddress).get()
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as UserCompany[]
  }

  // --- Get By Company ---
  static async getByCompany(companyId: string): Promise<UserCompany[]> {
    const snapshot = await collection.where("companyId", "==", companyId).get()
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as UserCompany[]
  }

  // --- Update Relation ---
  static async update(id: string, data: UpdateUserCompanyDTO): Promise<UserCompany | null> {
    const docRef = collection.doc(id)
    const snapshot = await docRef.get()
    if (!snapshot.exists) return null

    const updateData: Partial<UserCompany> = {
      ...data,
      updatedAt: data.updatedAt ?? Date.now(),
    }

    await docRef.update(updateData)
    const updatedDoc = await docRef.get()
    return { id: updatedDoc.id, ...updatedDoc.data() } as UserCompany
  }

  // --- Delete Relation ---
  static async delete(id: string): Promise<boolean> {
    const docRef = collection.doc(id)
    const snapshot = await docRef.get()
    if (!snapshot.exists) return false

    await docRef.delete()
    return true
  }
}
