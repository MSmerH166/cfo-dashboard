import React, { createContext, useState, useContext, useEffect } from 'react';
import { parseTrialBalanceData, buildHierarchy } from '../utils/trialBalanceUtils';

const FinancialContext = createContext();

export function useFinancial() {
  return useContext(FinancialContext);
}

const initialISData = {
  revenue: 0,
  cogs: 0,
  grossProfit: 0,
  expenses: 0,
  depreciation: 0,
  otherIncome: 0,
  zakat: 0,
  ociRemeasurement: 0,
  netIncome: 0,
};

const createInitialISYears = () => ({
  2020: { ...initialISData },
  2021: { ...initialISData },
  2022: { ...initialISData },
  2023: { ...initialISData },
  2024: { ...initialISData },
});

const loadHistoricalIS = () => {
  if (typeof window === 'undefined') return createInitialISYears();
  try {
    const saved = localStorage.getItem('historicalIS');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...createInitialISYears(),
        ...parsed,
      };
    }
  } catch (e) {
    console.warn('Failed to load historical IS from storage', e);
  }
  return createInitialISYears();
};

const initialBSData = {
  // أصول غير متداولة
  propertyEquipment: 0,
  nonCurrentAssets: 0,
  // أصول متداولة
  contractAssets: 0,
  receivables: 0,
  advancesOther: 0,
  cashBank: 0,
  currentAssets: 0,
  // إجمالي الأصول
  totalAssets: 0,

  // حقوق الملكية
  equityCapital: 0,
  equityStatutoryReserve: 0,
  retainedEarnings: 0,
  equityTotal: 0,

  // مطلوبات غير متداولة
  employeeBenefits: 0,
  nonCurrentLiabilities: 0,

  // مطلوبات متداولة
  relatedPartyPayables: 0,
  contractLiabilities: 0,
  payables: 0,
  otherCurrentLiabilities: 0,
  zakatTax: 0,
  currentLiabilities: 0,

  // الإجماليات
  totalLiabilities: 0,
  totalEquityLiabilities: 0,
  workingCapital: 0,
};

const createInitialBSYears = () => ({
  2020: { ...initialBSData },
  2021: { ...initialBSData },
  2022: { ...initialBSData },
  2023: { ...initialBSData },
  2024: { ...initialBSData },
});

const loadHistoricalBS = () => {
  if (typeof window === 'undefined') return createInitialBSYears();
  try {
    const saved = localStorage.getItem('historicalBS');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...createInitialBSYears(),
        ...parsed,
      };
    }
  } catch (e) {
    console.warn('Failed to load historical BS from storage', e);
  }
  return createInitialBSYears();
};

export function FinancialProvider({ children }) {
  // Historical Data (Manual Entry) with persistence
  const [historicalIS, setHistoricalIS] = useState(loadHistoricalIS);

  const [historicalBS, setHistoricalBS] = useState(loadHistoricalBS);

  // Trial Balance Data (2025) مع حفظ محلي
  // bump version to drop أي بيانات قديمة غير متوافقة
  const TRIAL_BALANCE_STORAGE_KEY = 'cfo_trial_balance_v2';

  const loadTrialBalance = () => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(TRIAL_BALANCE_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load trial balance from storage', e);
    }
    return [];
  };

  const [trialBalance, setTrialBalance] = useState(loadTrialBalance);
  const [tbError, setTbError] = useState(null);
  
  // 2025 Calculated Data
  const [data2025, setData2025] = useState({
    is: { ...initialISData },
    bs: { ...initialBSData }
  });

  // Persist historical IS entries so they survive refresh
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('historicalIS', JSON.stringify(historicalIS));
      } catch (e) {
        console.warn('Failed to save historical IS', e);
      }
    }
  }, [historicalIS]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('historicalBS', JSON.stringify(historicalBS));
      } catch (e) {
        console.warn('Failed to save historical BS', e);
      }
    }
  }, [historicalBS]);

  // Persist Trial Balance raw data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(TRIAL_BALANCE_STORAGE_KEY, JSON.stringify(trialBalance));
      } catch (e) {
        console.warn('Failed to save trial balance', e);
      }
    }
  }, [trialBalance]);

  // Process Trial Balance when it changes
  useEffect(() => {
    if (trialBalance.length === 0) {
      setTbError(null);
      return;
    }

    try {
      const parsed = parseTrialBalanceData(trialBalance);
      const { hierarchy, nodeIndex } = buildHierarchy(parsed);

      const getNode = (code) => nodeIndex?.get(code);
      const getAgg = (code) => {
        const n = getNode(code);
        if (!n) return { debit: 0, credit: 0, balance: 0 };
        return {
          debit: n.aggDebit ?? n.debit ?? 0,
          credit: n.aggCredit ?? n.credit ?? 0,
          balance: n.aggBalance ?? n.balance ?? 0,
        };
      };

      const is2025 = { ...initialISData };
      const bs2025 = { ...initialBSData };

      // مساعدين لالتقاط رصيد الكود
      const bal = (code) => {
        const n = getAgg(code);
        return n ? (n.aggBalance ?? n.balance ?? 0) : 0;
      };
      const absBal = (code) => Math.abs(bal(code));

      // إجماليات L1
      const l1_01 = bal('01');
      const l1_02 = bal('02');
      const l1_03 = absBal('03');
      const l1_04 = absBal('04'); // سنفصل مجمع الاهلاك كمقابل للأصول الثابتة
      const l1_05 = Math.abs(bal('05'));
      const l1_06 = bal('06');
      const l1_07 = Math.abs(bal('07'));

      // إجماليات فرعية (إن وجدت)
      const cogs = getAgg('0601').balance || l1_06;
      const opex = getAgg('0602').balance || 0;
      const depreciationExp = getAgg('0604').balance || 0;
      const zakatTax = getAgg('0605').balance || 0;

      // قائمة الدخل 2025
      is2025.revenue = l1_07;
      is2025.cogs = cogs;
      is2025.expenses = opex;
      is2025.depreciation = depreciationExp;
      is2025.otherIncome = 0;
      is2025.zakat = zakatTax;
      is2025.ociRemeasurement = 0;

      is2025.grossProfit = is2025.revenue - is2025.cogs;
      const mainOpsProfit = is2025.grossProfit - is2025.expenses - is2025.depreciation;
      const netBeforeZakat = mainOpsProfit + is2025.otherIncome;
      is2025.netIncome = netBeforeZakat - is2025.zakat;

      // قائمة المركز المالي 2025 (من ميزان المراجعة مباشرة)
      const cashBank = bal('0101') + bal('0108');
      const contractAssets = bal('0103');
      const receivables = bal('0102');
      const advancesOther = bal('0104') + bal('0106') + bal('0107') + bal('0109');
      const currentAssetsTotal = l1_01 || (cashBank + contractAssets + receivables + advancesOther);

      const propertyEquipmentGross = bal('0201');
      const accumulatedDep = bal('0402'); // مجمع الاهلاك (رصيد دائن → قيمة سالبة)
      const propertyEquipmentNet = propertyEquipmentGross + accumulatedDep;
      const nonCurrentAssetsTotal = l1_02 || propertyEquipmentNet;

      const payables = absBal('0301') + absBal('0302');
      const contractLiabilities = absBal('0305');
      const relatedPartyPayables = absBal('0309');
      const otherCurrentLiabilities = absBal('0304') + absBal('0306') + absBal('0307') + absBal('0308');
      const zakatProvision = absBal('03080104');
      const currentLiabilitiesTotal = l1_03 || (payables + contractLiabilities + otherCurrentLiabilities + relatedPartyPayables + zakatProvision);

      const employeeBenefits = absBal('0401');
      const nonCurrentLiabilitiesTotal = employeeBenefits;

      const totalLiabilities = currentLiabilitiesTotal + nonCurrentLiabilitiesTotal;

      const equityCapital = absBal('0501');
      const equityStatutoryReserve = absBal('0502');
      const retainedEarnings = bal('0504') + bal('0503');
      const equityBase = l1_05 || (equityCapital + equityStatutoryReserve + Math.abs(retainedEarnings || 0));
      const equityTotal = equityBase + (is2025.netIncome || 0);

      bs2025.cashBank = cashBank;
      bs2025.contractAssets = contractAssets;
      bs2025.receivables = receivables;
      bs2025.advancesOther = advancesOther;
      bs2025.currentAssets = currentAssetsTotal;

      bs2025.propertyEquipment = propertyEquipmentNet;
      bs2025.nonCurrentAssets = nonCurrentAssetsTotal;

      bs2025.totalAssets = (currentAssetsTotal || 0) + (nonCurrentAssetsTotal || 0);

      bs2025.relatedPartyPayables = relatedPartyPayables;
      bs2025.contractLiabilities = contractLiabilities;
      bs2025.payables = payables;
      bs2025.otherCurrentLiabilities = otherCurrentLiabilities;
      bs2025.zakatTax = zakatProvision;
      bs2025.currentLiabilities = currentLiabilitiesTotal;
      bs2025.employeeBenefits = employeeBenefits;
      bs2025.nonCurrentLiabilities = nonCurrentLiabilitiesTotal;
      bs2025.totalLiabilities = totalLiabilities;

      bs2025.equityCapital = equityCapital;
      bs2025.equityStatutoryReserve = equityStatutoryReserve;
      bs2025.retainedEarnings = retainedEarnings;
      bs2025.equityTotal = equityTotal;

      bs2025.totalEquityLiabilities = totalLiabilities + equityTotal;
      bs2025.workingCapital = (currentAssetsTotal || 0) - (currentLiabilitiesTotal || 0);

      setData2025({ is: is2025, bs: bs2025 });
      setTbError(null);
    } catch (e) {
      console.error('Trial balance processing error:', e);
      if (e.validationErrors && e.validationErrors.length > 0) {
        setTbError(e.validationErrors[0].message || 'تحقق الكود/الاسم فشل. راجع ملف الرفع.');
      } else {
        setTbError('حدث خطأ أثناء معالجة ميزان المراجعة. يرجى التحقق من الملف أو إعادة الرفع.');
      }
      // احتفظ بالقيم السابقة حتى لا تختفي الصفحة
    }
  }, [trialBalance]);

  const updateHistoricalIS = (year, field, value) => {
    setHistoricalIS(prev => ({
      ...prev,
      [year]: { ...prev[year], [field]: parseFloat(value) || 0 }
    }));
  };

  const updateHistoricalISBatch = (payload = {}) => {
    setHistoricalIS(prev => {
      const next = { ...prev };
      Object.entries(payload).forEach(([year, values]) => {
        next[year] = { ...(next[year] || {}), ...values };
      });
      return next;
    });
  };

  const updateHistoricalBS = (year, field, value) => {
    setHistoricalBS(prev => ({
      ...prev,
      [year]: { ...prev[year], [field]: parseFloat(value) || 0 }
    }));
  };

  const resetAllData = () => {
    // Clear caches
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('historicalIS');
        localStorage.removeItem('historicalBS');
        localStorage.removeItem(TRIAL_BALANCE_STORAGE_KEY);
      } catch (e) {
        console.warn('Failed clearing localStorage', e);
      }
    }
    setHistoricalIS(createInitialISYears());
    setHistoricalBS(createInitialBSYears());
    setTrialBalance([]);
    setData2025({ is: { ...initialISData }, bs: { ...initialBSData } });
    setTbError(null);
  };

  return (
    <FinancialContext.Provider value={{
      historicalIS,
      historicalBS,
      data2025,
      trialBalance,
      setTrialBalance,
      tbError,
      updateHistoricalIS,
      updateHistoricalISBatch,
      updateHistoricalBS,
      resetAllData
    }}>
      {children}
    </FinancialContext.Provider>
  );
}

