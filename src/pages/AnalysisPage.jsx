import React from 'react';
import { useFinancial } from '../context/FinancialContext';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function AnalysisPage() {
  const { historicalIS, historicalBS, data2025 } = useFinancial();
  const years = [2020, 2021, 2022, 2023, 2024, 2025];

  const getData = (year) => {
    const is = year === 2025 ? data2025.is : historicalIS[year];
    const bs = year === 2025 ? data2025.bs : historicalBS[year];
    return { is, bs };
  };

  const calculateRatios = () => {
    return years.map(year => {
      const { is, bs } = getData(year);
      
      const revenue = is?.revenue || 0;
      const netIncome = is?.netIncome ?? (
        (is.revenue || 0) -
        (is.cogs || 0) -
        (is.expenses || 0) -
        (is.depreciation || 0) +
        (is.otherIncome || 0) -
        (is.zakat || 0)
      );
      const totalAssets = bs?.totalAssets ?? ((bs?.currentAssets || 0) + (bs?.nonCurrentAssets || bs?.fixedAssets || 0));
      const totalLiabilities = bs?.totalLiabilities ?? ((bs?.currentLiabilities || 0) + (bs?.nonCurrentLiabilities || bs?.longTermLiabilities || 0));
      const equity = bs?.equityTotal ?? bs?.equity ?? 0;

      return {
        year,
        grossMargin: revenue ? ((revenue - (is.cogs || 0)) / revenue) * 100 : 0,
        netMargin: revenue ? (netIncome / revenue) * 100 : 0,
        roe: equity ? (netIncome / equity) * 100 : 0,
        roa: totalAssets ? (netIncome / totalAssets) * 100 : 0,
        currentRatio: (bs?.currentLiabilities || 0) ? ((bs?.currentAssets || 0) / bs.currentLiabilities) : 0,
        debtToAssets: totalAssets ? (totalLiabilities / totalAssets) * 100 : 0,
        debtToEquity: equity ? (totalLiabilities / equity) * 100 : 0,
        assetTurnover: totalAssets ? (revenue / totalAssets) : 0
      };
    });
  };

  const ratios = calculateRatios();

  const exportPDF = () => {
    const input = document.getElementById('analysis-page');
    html2canvas(input).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save("financial_analysis.pdf");
    });
  };

  return (
    <div id="analysis-page" className="p-6 space-y-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-blue-900">التحليل المالي الشامل</h1>
          <p className="text-gray-500 text-sm mt-1">مؤشرات الأداء والنسب المالية (2020 - 2025)</p>
        </div>
        <button onClick={exportPDF} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Download size={18} />
          <span>تصدير PDF</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profitability Chart */}
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="font-bold text-lg mb-4">مؤشرات الربحية (%)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ratios}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="grossMargin" name="هامش الربح الإجمالي" stroke="#2563eb" />
                <Line type="monotone" dataKey="netMargin" name="هامش صافي الربح" stroke="#16a34a" />
                <Line type="monotone" dataKey="roe" name="العائد على حقوق الملكية" stroke="#9333ea" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Liquidity & Leverage Chart */}
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="font-bold text-lg mb-4">السيولة والمديونية</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ratios}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="currentRatio" name="نسبة التداول (مرة)" fill="#8884d8" />
                <Bar yAxisId="right" dataKey="debtToAssets" name="نسبة الديون (%)" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-xl shadow-md overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="p-4">المؤشر المالي</th>
              {years.map(y => <th key={y} className="p-4">{y}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr className="bg-gray-50"><td colSpan={7} className="p-2 font-bold text-blue-900">نسب الربحية</td></tr>
            <tr><td className="p-3 font-medium">هامش مجمل الربح (%)</td>{ratios.map(r => <td key={r.year} className="p-3">{r.grossMargin.toFixed(1)}%</td>)}</tr>
            <tr><td className="p-3 font-medium">هامش صافي الربح (%)</td>{ratios.map(r => <td key={r.year} className="p-3">{r.netMargin.toFixed(1)}%</td>)}</tr>
            <tr><td className="p-3 font-medium">العائد على الأصول (ROA) (%)</td>{ratios.map(r => <td key={r.year} className="p-3">{r.roa.toFixed(1)}%</td>)}</tr>
            <tr><td className="p-3 font-medium">العائد على حقوق الملكية (ROE) (%)</td>{ratios.map(r => <td key={r.year} className="p-3">{r.roe.toFixed(1)}%</td>)}</tr>

            <tr className="bg-gray-50"><td colSpan={7} className="p-2 font-bold text-blue-900">نسب السيولة</td></tr>
            <tr><td className="p-3 font-medium">نسبة التداول (مرة)</td>{ratios.map(r => <td key={r.year} className="p-3">{r.currentRatio.toFixed(2)}</td>)}</tr>

            <tr className="bg-gray-50"><td colSpan={7} className="p-2 font-bold text-blue-900">نسب المديونية (الرفع المالي)</td></tr>
            <tr><td className="p-3 font-medium">الديون إلى الأصول (%)</td>{ratios.map(r => <td key={r.year} className="p-3">{r.debtToAssets.toFixed(1)}%</td>)}</tr>
            <tr><td className="p-3 font-medium">الديون إلى حقوق الملكية (%)</td>{ratios.map(r => <td key={r.year} className="p-3">{r.debtToEquity.toFixed(1)}%</td>)}</tr>

            <tr className="bg-gray-50"><td colSpan={7} className="p-2 font-bold text-blue-900">نسب النشاط (الكفاءة)</td></tr>
            <tr><td className="p-3 font-medium">معدل دوران الأصول (مرة)</td>{ratios.map(r => <td key={r.year} className="p-3">{r.assetTurnover.toFixed(2)}</td>)}</tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
