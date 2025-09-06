import { db } from '../config/firebase.js';
import CompanyDTO from '../dtos/companyDTO.js';
import type { Company } from '../types/Company.js';

const collection = db.collection('companies');

export const createCompany = async (data: Partial<Company>) => {
  const companyDTO = new CompanyDTO(data as any);
  companyDTO.validate();
  companyDTO.createdAt = Date.now();

  const docRef = await collection.add(companyDTO.toJSON());
  return { id: docRef.id, ...companyDTO.toJSON() };
};

export const getCompanies = async (): Promise<Company[]> => {
  const snapshot = await collection.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
};

export const getCompanyById = async (id: string): Promise<Company | null> => {
  const doc = await collection.doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Company;
};

export const updateCompany = async (id: string, data: Partial<Company>): Promise<Company | null> => {
  const companyDTO = new CompanyDTO(data as any);
  companyDTO.validate();
  companyDTO.updatedAt = Date.now();

  const docRef = collection.doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return null;

  await docRef.update(companyDTO.toJSON());
  return { id, ...companyDTO.toJSON() };
};

export const deleteCompany = async (id: string): Promise<boolean> => {
  const docRef = collection.doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return false;

  await docRef.delete();
  return true;
};
