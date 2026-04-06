import { useCallback, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Upload, FileCheck, AlertTriangle, FileSpreadsheet, ArrowRight } from 'lucide-react';
import { detectTimeSeries, isNumericColumn, type TimeSeriesData } from '@/lib/forecasting';

interface Props {
  onDataReady: (data: TimeSeriesData) => void;
}

type Status = 'idle' | 'loading' | 'error' | 'success';

export default function DataUpload({ onDataReady }: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<TimeSeriesData | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const processRows = useCallback((rows: string[][]) => {
    if (rows.length < 5) {
      setError('Need at least 5 rows of data (excluding header).');
      setStatus('error');
      return;
    }
    // Expect exactly 2 columns
    const cols = rows[0].length;
    if (cols !== 2) {
      setError(`Expected 2 columns (time + value), found ${cols}.`);
      setStatus('error');
      return;
    }
    const header = rows[0];
    const dataRows = rows.slice(1).filter(r => r.length === 2 && r[0].trim() && r[1].trim());
    if (dataRows.length < 5) {
      setError('Need at least 5 data rows after header.');
      setStatus('error');
      return;
    }
    const col0 = dataRows.map(r => r[0]);
    const col1 = dataRows.map(r => r[1]);

    // Detect which is time and which is value
    const c0Time = detectTimeSeries(col0);
    const c1Numeric = isNumericColumn(col1);
    const c1Time = detectTimeSeries(col1);
    const c0Numeric = isNumericColumn(col0);

    let labels: string[];
    let values: number[];

    if (c0Time && c1Numeric) {
      labels = col0;
      values = col1.map(Number);
    } else if (c1Time && c0Numeric) {
      labels = col1;
      values = col0.map(Number);
    } else {
      setError('Could not identify a time/date column with strictly increasing values and a numeric data column.');
      setStatus('error');
      return;
    }

    const result: TimeSeriesData = { labels, values };
    setPreview(result);
    setStatus('success');
  }, []);

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    setStatus('loading');
    setError('');
    setPreview(null);

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'csv') {
      Papa.parse(file, {
        complete: (res) => {
          processRows(res.data as string[][]);
        },
        error: () => {
          setError('Failed to parse CSV.');
          setStatus('error');
        },
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const wb = XLSX.read(e.target?.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
        processRows(rows.map(r => r.map(String)));
      };
      reader.readAsArrayBuffer(file);
    } else {
      setError('Unsupported file type. Use .csv or .xlsx');
      setStatus('error');
    }
  }, [processRows]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-2xl space-y-8"
      >
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="gradient-text">Time Series Forecaster</span>
          </h1>
          <p className="text-muted-foreground text-lg">Upload your data to get SMA & EWMA predictions</p>
        </div>

        {/* Drop zone */}
        <motion.div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className={`glass rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
            dragOver ? 'border-primary glow-primary' : ''
          } ${status === 'success' ? 'border-primary/50' : ''} ${status === 'error' ? 'border-destructive/50' : ''}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <AnimatePresence mode="wait">
            {status === 'idle' && (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium text-foreground">Drop CSV or XLSX file here</p>
                <p className="text-sm text-muted-foreground">or click to browse</p>
              </motion.div>
            )}
            {status === 'loading' && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="h-10 w-10 mx-auto border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-muted-foreground">Parsing {fileName}...</p>
              </motion.div>
            )}
            {status === 'error' && (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
                <p className="text-destructive font-medium">{error}</p>
                <p className="text-sm text-muted-foreground">Click to try again</p>
              </motion.div>
            )}
            {status === 'success' && preview && (
              <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                <FileCheck className="mx-auto h-12 w-12 text-primary" />
                <p className="text-primary font-medium">{fileName} — {preview.values.length} data points detected</p>
                <p className="text-sm text-muted-foreground">Click to change file</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Proceed */}
        <AnimatePresence>
          {status === 'success' && preview && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <button
                onClick={() => onDataReady(preview)}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-lg hover:opacity-90 transition-opacity animate-pulse-glow"
              >
                Proceed to Forecasting <ArrowRight className="h-5 w-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Example format */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-xl p-6 space-y-3"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <FileSpreadsheet className="h-4 w-4" />
            Accepted format example
          </div>
          <div className="font-mono text-sm bg-secondary/50 rounded-lg p-4 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-primary">
                  <th className="pr-8 pb-2">Date</th>
                  <th className="pb-2">Sales</th>
                </tr>
              </thead>
              <tbody className="text-foreground/80">
                {['2024-01-01,120','2024-02-01,135','2024-03-01,150','2024-04-01,128','2024-05-01,145'].map((r,i) => {
                  const [d,v] = r.split(',');
                  return (
                    <tr key={i}>
                      <td className="pr-8 py-0.5">{d}</td>
                      <td>{v}</td>
                    </tr>
                  );
                })}
                <tr className="text-muted-foreground"><td>...</td><td>...</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            Exactly 2 columns: one strictly increasing time/date column + one numeric data column. Min 5 rows.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
