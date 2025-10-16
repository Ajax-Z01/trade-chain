import { db } from '../config/firebase.js';
import CompanyDTO from '../dtos/companyDTO.js';
import type { Company } from '../types/Company.js';
import { notifyWithAdmins } from "../utils/notificationHelper.js";

const collection = db.collection('companies');

export class CompanyModel {
  // --- Admin/manual create company ---
  static async createCompany(data: Partial<Company>, executor: string): Promise<Company> {
    const companyDTO = new CompanyDTO(data as any);
    companyDTO.validate();
    companyDTO.createdAt = Date.now();

    const docRef = await collection.add(companyDTO.toJSON());
    const company = { id: docRef.id, ...companyDTO.toJSON() };

    // Kirim notifikasi ke admin
    await notifyWithAdmins(executor, {
      type: 'system',
      title: 'Company Created',
      message: `Company "${companyDTO.name}" has been created by ${executor}.`,
      data: {
        companyId: docRef.id,
        name: companyDTO.name,
      },
    });

    return company;
  }

  // --- Admin/manual update company ---
  static async updateCompany(id: string, data: Partial<Company>, executor: string): Promise<Company | null> {
    const docRef = collection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return null;

    const oldData = doc.data() as Company;

    const safeData = {
      ...oldData,
      ...data,
      address: data.address || oldData.address || executor,
      name: data.name || oldData.name || `Company of ${executor}`,
      city: data.city || oldData.city || 'N/A',
      stateOrProvince: data.stateOrProvince || oldData.stateOrProvince || 'N/A',
      postalCode: data.postalCode || oldData.postalCode || '00000',
      country: data.country || oldData.country || 'N/A',
      email: data.email || oldData.email || `${executor}@example.com`,
    };

    const companyDTO = new CompanyDTO(safeData);
    companyDTO.validate();
    companyDTO.updatedAt = Date.now();

    await docRef.update(companyDTO.toJSON());
    const company = { id, ...companyDTO.toJSON() };

    // Notifikasi admin
    await notifyWithAdmins(executor, {
      type: 'system',
      title: 'Company Updated',
      message: `Company "${companyDTO.name}" has been updated by ${executor}.`,
      data: { companyId: id, name: companyDTO.name },
    });

    return company;
  }

  // --- Admin/manual delete company ---
  static async deleteCompany(id: string, executor: string): Promise<boolean> {
    const docRef = collection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return false;

    const company = doc.data() as Company;

    await docRef.delete();

    // Kirim notifikasi ke admin
    await notifyWithAdmins(executor, {
      type: 'system',
      title: 'Company Deleted',
      message: `Company "${company?.name}" has been deleted by ${executor}.`,
      data: {
        companyId: id,
        name: company?.name,
      },
    });

    return true;
  }

  // --- Get all companies ---
  static async getCompanies(): Promise<Company[]> {
    const snapshot = await collection.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
  }

  // --- Get company by ID ---
  static async getCompanyById(id: string): Promise<Company | null> {
    const doc = await collection.doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Company;
  }

  // --- Auto-create default company untuk user baru ---
  static async createDefaultForUser(address: string): Promise<Company> {
    const data: Omit<Company, 'id'> = {
      name: `Company of ${address}`,
      address: 'Street Address',
      city: 'City',
      stateOrProvince: 'Province',
      postalCode: '00000',
      country: 'Country',
      email: 'email@example.com',
      phone: '+1234567890',
      taxId: '1234567890',
      registrationNumber: '1234567890',
      businessType: 'Business Type',
      website: 'https://example.com',
      walletAddress: address,
      verified: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const docRef = await collection.add(data);
    const company = { id: docRef.id, ...data };

    await notifyWithAdmins(address, {
      type: 'system',
      title: 'Company Created',
      message: `Company "${company.name}" has been created by ${address}.`,
      data: { companyId: company.id, name: company.name },
    });

    return company;
  }
}
