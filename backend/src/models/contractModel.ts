import admin from 'firebase-admin';
import ContractLogDTO from '../dtos/contractDTO.js';
import { db } from '../config/firebase.js'

const collection = db.collection('contractLogs');

export const addContractLog = async (data: Partial<ContractLogDTO>) => {
  const dto = new ContractLogDTO(data as any);
  dto.validate();
  const docRef = collection.doc(dto.contractAddress);
  const doc = await docRef.get();

  if (doc.exists) {
    await docRef.update({
      history: admin.firestore.FieldValue.arrayUnion(dto.toJSON()),
    });
  } else {
    await docRef.set({ contractAddress: dto.contractAddress, history: [dto.toJSON()] });
  }
};
