import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../firebaseConfig";

export async function getValorKmHistorico(garg: string, data: Date): Promise<number> {
    if (!garg || !data) return 0;

    const consorcio = garg.startsWith("AS") ? "atlanticoSul" : "sudoeste";

    const ref = collection(db, "valorKm", consorcio, "historico");

    const snap = await getDocs(ref);

    const vigencias = snap.docs
        .map(d => ({
            dataInicio: new Date(d.data().dataInicio),
            valorKm: d.data().valorKm
        }))
        .filter(v => v.dataInicio <= data)
        .sort((a, b) => b.dataInicio.getTime() - a.dataInicio.getTime());

    return vigencias.length > 0 ? vigencias[0].valorKm : 0;
}
