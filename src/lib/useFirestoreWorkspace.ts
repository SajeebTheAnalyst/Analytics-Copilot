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
      // Load local state fallback on guest/logout mode
      try {
        const saved = localStorage.getItem('ac_suggestions_local');
        if (saved) {
          setSuggestions(JSON.parse(saved));
        } else {
          setSuggestions([]);
        }
      } catch {
        setSuggestions([]);
      }
      setDatasets([]);
      setDashboards([]);
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
    setDatasets(prev => {
      const exists = prev.some(d => d.id === dataset.id);
      const updated = exists ? prev.map(d => d.id === dataset.id ? dataset : d) : [...prev, dataset];
      try {
        localStorage.setItem('ac_datasets_local', JSON.stringify(updated));
      } catch (e) {
        console.warn('LocalStorage error saving dataset:', e);
      }
      return updated;
    });

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
    setSuggestions(prev => {
      const exists = prev.some(s => s.id === suggestion.id);
      if (exists) {
        return prev.map(s => s.id === suggestion.id ? suggestion : s);
      }
      return [...prev, suggestion];
    });

    try {
      const saved = localStorage.getItem('ac_suggestions_local');
      const list: RelationshipSuggestion[] = saved ? JSON.parse(saved) : [];
      const updatedList = [...list.filter(s => s.id !== suggestion.id), suggestion];
      localStorage.setItem('ac_suggestions_local', JSON.stringify(updatedList));

      const delSaved = localStorage.getItem('ac_deleted_suggestions');
      if (delSaved) {
        const delList: string[] = JSON.parse(delSaved);
        if (delList.includes(suggestion.id)) {
          localStorage.setItem('ac_deleted_suggestions', JSON.stringify(delList.filter(id => id !== suggestion.id)));
        }
      }
    } catch (e) {
      console.warn('LocalStorage error saving suggestion:', e);
    }

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
    setDatasets(prev => {
      const updated = prev.filter(d => d.id !== id);
      try {
        localStorage.setItem('ac_datasets_local', JSON.stringify(updated));
      } catch (e) {
        console.warn('LocalStorage error deleting dataset:', e);
      }
      return updated;
    });

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

  const deleteSuggestion = async (id: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== id));

    try {
      const saved = localStorage.getItem('ac_suggestions_local');
      if (saved) {
        const list: RelationshipSuggestion[] = JSON.parse(saved);
        const updatedList = list.filter(s => s.id !== id);
        localStorage.setItem('ac_suggestions_local', JSON.stringify(updatedList));
      }

      const delSaved = localStorage.getItem('ac_deleted_suggestions');
      const delList: string[] = delSaved ? JSON.parse(delSaved) : [];
      if (!delList.includes(id)) {
        localStorage.setItem('ac_deleted_suggestions', JSON.stringify([...delList, id]));
      }
    } catch (e) {
      console.warn('LocalStorage error deleting suggestion:', e);
    }

    if (!user) return;
    const path = `users/${user.uid}/suggestions`;
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
    deleteSuggestion,
    deleteKpi,
    deleteMisReport,
    setDatasets,
    setDashboards,
    setSuggestions,
    setKpis,
    setMisReports
  };
}
