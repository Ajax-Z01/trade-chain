import { db } from "../config/firebase.js"

export const getContractRoles = async (contractAddress: string) => {
  const contractsLogs = db.collection("contractLogs")
  const snapshot = await contractsLogs
    .where("contractAddress", "==", contractAddress)
    .get()

  if (snapshot.empty) return { importer: "", exporter: "" }

  const deployLog = snapshot.docs[0].data().history?.find(
    (h: any) => h.action === "deploy"
  )

  if (!deployLog || !deployLog.extra) return { importer: "", exporter: "" }

  let importer = deployLog.extra.importer || ""
  let exporter = deployLog.extra.exporter || ""

  return { importer, exporter }
}
