import { db } from "../config/firebase.js"

export const getContractRoles = async (contractAddress: string) => {
  const contractsLogs = db.collection("contractsLogs")
  const snapshot = await contractsLogs
    .where("contractAddress", "==", contractAddress)
    .get()

  if (snapshot.empty) return { importer: "", exporter: "" }

  const deployLog = snapshot.docs[0].data().history?.find(
    (h: any) => h.action === "deploy"
  )

  if (!deployLog || !deployLog.extra) return { importer: "", exporter: "" }

  return {
    importer: deployLog.extra.importer?.toLowerCase() || "",
    exporter: deployLog.extra.exporter?.toLowerCase() || "",
  }
}
