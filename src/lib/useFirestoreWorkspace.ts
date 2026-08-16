import { useEffect, useState } from 'react';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { collection, doc, onSnapshot, setDoc, query, getDocs, deleteDoc } from 'firebase/firestore';
import { Dataset, Dashboard, RelationshipSuggestion, KpiDefinition, MisReportConfig } from '@/types';

export function useFirestoreWorkspace(user: any) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [suggestions, setSuggestions] = useState<RelationshipSuggestion[]>([]);
  const [kpis, setKpis] = useState<KpiDefinition[]>([]);
  const [misReports, setMisReports] = useState<MisReportConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      // Clear state on logout
      setDatasets([]);
      setDashboards([]);
      setSuggestions([]);
      setKpis([]);
      setMisReports([]);
      setLoading(false);
      return;
    }

    const userId = user.uid;
    const datasetsPath = `users/${userId}/datasets`;
    const dashboardsPath = `users/${userId}/dashboards`;
    const suggestionsPath = `users/${userId}/suggestions`;
    const kpisPath = `users/${userId}/kpis`;
    const misReportsPath = `users/${userId}/misReports`;

    // Listen to datasets
    const unsubDatasets = onSnapshot(collection(db, datasetsPath), (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Dataset);
      setDatasets(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, datasetsPath));

    // Listen to dashboards
    const unsubDashboards = onSnapshot(collection(db, dashboardsPath), (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Dashboard);
      setDashboards(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, dashboardsPath));

    // Listen to suggestions
    const unsubSuggestions = onSnapshot(collection(db, suggestionsPath), (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as RelationshipSuggestion);
      setSuggestions(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, suggestionsPath));

    // Listen to KPIs
    const unsubKpis = onSnapshot(collection(db, kpisPath), (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as KpiDefinition);
      setKpis(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, kpisPath));

    // Listen to MIS Reports
    const unsubMisReports = onSnapshot(collection(db, misReportsPath), (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as MisReportConfig);
      setMisReports(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, misReportsPath));

    setLoading(false);

    return () => {
      unsubDatasets();
      unsubDashboards();
      unsubSuggestions();
      unsubKpis();
      unsubMisReports();
    };
  }, [user]);

  const saveDataset = async (dataset: Dataset) => {
    if (!user) return;
    const path = `users/${user.uid}/datasets`;
    try {
      await setDoc(doc(db, path, dataset.id), {
        ...dataset,
        userId: user.uid,
        updatedAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${dataset.id}`);
    }
  };

  const saveDashboard = async (dashboard: Dashboard) => {
    if (!user) return;
    const path = `users/${user.uid}/dashboards`;
    try {
      await setDoc(doc(db, path, dashboard.id), {
        ...dashboard,
        userId: user.uid,
        updatedAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${dashboard.id}`);
    }
  };

  const saveSuggestion = async (suggestion: RelationshipSuggestion) => {
    if (!user) return;
    const path = `users/${user.uid}/suggestions`;
    try {
      await setDoc(doc(db, path, suggestion.id), {
        ...suggestion,
        userId: user.uid
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${suggestion.id}`);
    }
  };

  const saveKpi = async (kpi: KpiDefinition) => {
    if (!user) return;
    const path = `users/${user.uid}/kpis`;
    try {
      await setDoc(doc(db, path, kpi.id), {
        ...kpi,
        userId: user.uid,
        updatedAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${kpi.id}`);
    }
  };

  const saveMisReport = async (report: MisReportConfig) => {
    if (!user) return;
    const path = `users/${user.uid}/misReports`;
    try {
      await setDoc(doc(db, path, report.id), {
        ...report,
        userId: user.uid,
        updatedAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${report.id}`);
    }
  };

  const deleteDataset = async (id: string) => {
    if (!user) return;
    const path = `users/${user.uid}/datasets`;
    try {
      await deleteDoc(doc(db, path, id));
    } catch (error) {
       handleFirestoreError(error, OperationType.DELETE, `${path}/${id}`);
    }
  };

  const deleteDashboard = async (id: string) => {
    if (!user) return;
    const path = `users/${user.uid}/dashboards`;
    try {
      await deleteDoc(doc(db, path, id));
    } catch (error) {
       handleFirestoreError(error, OperationType.DELETE, `${path}/${id}`);
    }
  };

  const deleteKpi = async (id: string) => {
    if (!user) return;
    const path = `users/${user.uid}/kpis`;
    try {
      await deleteDoc(doc(db, path, id));
    } catch (error) {
       handleFirestoreError(error, OperationType.DELETE, `${path}/${id}`);
    }
  };

  const deleteMisReport = async (id: string) => {
    if (!user) return;
    const path = `users/${user.uid}/misReports`;
    try {
      await deleteDoc(doc(db, path, id));
    } catch (error) {
       handleFirestoreError(error, OperationType.DELETE, `${path}/${id}`);
    }
  };

  return {
    datasets,
    dashboards,
    suggestions,
    kpis,
    misReports,
    loading,
    saveDataset,
    saveDashboard,
    saveSuggestion,
    saveKpi,
    saveMisReport,
    deleteDataset,
    deleteDashboard,
    deleteKpi,
    deleteMisReport,
    setDatasets,
    setDashboards,
    setSuggestions,
    setKpis,
    setMisReports
  };
}
