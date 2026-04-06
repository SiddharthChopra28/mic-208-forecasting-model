import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import DataUpload from '@/components/DataUpload';
import ForecastView from '@/components/ForecastView';
import type { TimeSeriesData } from '@/lib/forecasting';

export default function Index() {
  const [data, setData] = useState<TimeSeriesData | null>(null);

  return (
    <AnimatePresence mode="wait">
      {!data ? (
        <motion.div key="upload" exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.3 }}>
          <DataUpload onDataReady={setData} />
        </motion.div>
      ) : (
        <motion.div key="forecast" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          <ForecastView data={data} onBack={() => setData(null)} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
