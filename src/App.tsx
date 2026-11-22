import { useCallback, useState } from 'react';
import { AboutMethodPage } from './components/about/AboutMethodPage';
import { BenchmarkPage } from './components/benchmark/BenchmarkPage';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { InventoryPage } from './components/inventory/InventoryPage';
import { AppShell, type AppTab } from './components/layout/AppShell';
import {
  loadWarehouseItems,
  resetWarehouseItems,
  saveWarehouseItems,
} from './data/storage';
import type { BenchmarkResultRecord, ItemInput, WarehouseItem } from './types';

function createItemId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [items, setItems] = useState<WarehouseItem[]>(() => loadWarehouseItems());
  const [benchmarkHistory, setBenchmarkHistory] = useState<BenchmarkResultRecord[]>([]);
  const [latestBenchmarkBatch, setLatestBenchmarkBatch] = useState<BenchmarkResultRecord[]>([]);

  const commitItems = useCallback((updater: (prev: WarehouseItem[]) => WarehouseItem[]) => {
    setItems((prev) => {
      const next = updater(prev);
      saveWarehouseItems(next);
      return next;
    });
  }, []);

  const handleCreateItem = useCallback(
    (input: ItemInput) => {
      const newItem: WarehouseItem = {
        ...input,
        id: createItemId(),
        diperbaruiPada: new Date().toISOString(),
      };
      commitItems((prev) => [newItem, ...prev]);
    },
    [commitItems],
  );

  const handleUpdateItem = useCallback(
    (id: string, input: ItemInput) => {
      const now = new Date().toISOString();
      commitItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                ...input,
                diperbaruiPada: now,
              }
            : item,
        ),
      );
    },
    [commitItems],
  );

  const handleDeleteItem = useCallback(
    (id: string) => {
      commitItems((prev) => prev.filter((item) => item.id !== id));
    },
    [commitItems],
  );

  const handleResetDemoData = useCallback(() => {
    const fresh = resetWarehouseItems();
    setItems(fresh);
  }, []);

  const handleAppendHistory = useCallback((newResults: BenchmarkResultRecord[]) => {
    setLatestBenchmarkBatch(newResults);
    setBenchmarkHistory((prev) => [...newResults, ...prev]);
  }, []);

  const handleClearHistory = useCallback(() => {
    setBenchmarkHistory([]);
    setLatestBenchmarkBatch([]);
  }, []);

  return (
    <AppShell
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      totalItemsCount={items.length}
      benchmarkCount={benchmarkHistory.length}
    >
      {activeTab === 'dashboard' ? (
        <DashboardPage
          items={items}
          benchmarkHistory={benchmarkHistory}
          latestBenchmarkBatch={latestBenchmarkBatch}
          onNavigate={setActiveTab}
        />
      ) : activeTab === 'inventory' ? (
        <InventoryPage
          items={items}
          onCreateItem={handleCreateItem}
          onUpdateItem={handleUpdateItem}
          onDeleteItem={handleDeleteItem}
          onResetDemoData={handleResetDemoData}
        />
      ) : activeTab === 'benchmark' ? (
        <BenchmarkPage
          history={benchmarkHistory}
          onAppendHistory={handleAppendHistory}
          onClearHistory={handleClearHistory}
        />
      ) : (
        <AboutMethodPage />
      )}
    </AppShell>
  );
}

export default App;
