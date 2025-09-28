import { db } from '../config/firebase.js';
import CompanyDTO from '../dtos/companyDTO.js';
import type { Company } from '../types/Company.js';
import { notifyWithAdmins } from "../utils/notificationHelper.js";

const collection = db.collection('companies');

export const createCompany = async (data: Partial<Company>, executor: string) => {
  const companyDTO = new CompanyDTO(data as any);
  companyDTO.validate();
  companyDTO.createdAt = Date.now();

  const docRef = await collection.add(companyDTO.toJSON());
  const company = { id: docRef.id, ...companyDTO.toJSON() };

  // Kirim notifikasi dengan payload tambahan
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
};

export const updateCompany = async (id: string, data: Partial<Company>, executor: string): Promise<Company | null> => {
  const companyDTO = new CompanyDTO(data as any);
  companyDTO.validate();
  companyDTO.updatedAt = Date.now();

  const docRef = collection.doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return null;

  await docRef.update(companyDTO.toJSON());
  const company = { id, ...companyDTO.toJSON() };

  // Kirim notifikasi dengan payload tambahan
  await notifyWithAdmins(executor, {
    type: 'system',
    title: 'Company Updated',
    message: `Company "${companyDTO.name}" has been updated by ${executor}.`,
    data: {
      companyId: id,
      name: companyDTO.name,
    },
  });

  return company;
};

export const deleteCompany = async (id: string, executor: string): Promise<boolean> => {
  const docRef = collection.doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return false;

  const company = doc.data() as Company;

  await docRef.delete();

  // Kirim notifikasi dengan payload tambahan
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
