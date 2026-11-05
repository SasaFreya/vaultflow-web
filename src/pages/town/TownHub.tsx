import { Routes, Route, Navigate } from 'react-router-dom';
import { LifeRPGProvider } from '@/hooks/useLifeRPG';
import { LifeMemoriesProvider } from '@/hooks/useLifeMemories';
import { TownProvider } from '@/hooks/useTown';
import HubTownMap from '@/pages/town/HubTownMap';
import WorldMap from '@/pages/town/WorldMap';
import LocationScene from '@/pages/town/LocationScene';
import HomeEditor from '@/pages/town/HomeEditor';
import ShopPage from '@/pages/town/ShopPage';
import InventoryPage from '@/pages/town/InventoryPage';
import MemoriesPage from '@/pages/town/MemoriesPage';
import MemoriesReportPage from '@/pages/town/MemoriesReportPage';
import LoftPage from '@/pages/town/LoftPage';
import DreamSpacePage from '@/pages/town/DreamSpacePage';

export default function TownHub() {
  return (
    <LifeRPGProvider>
      <LifeMemoriesProvider>
        <TownProvider>
          <Routes>
            <Route index element={<HubTownMap />} />
            <Route path="explore" element={<WorldMap />} />
            <Route path="memories" element={<MemoriesPage />} />
            <Route path="loft" element={<LoftPage />} />
            <Route path="dream" element={<DreamSpacePage />} />
            <Route path="memories/report" element={<MemoriesReportPage />} />
            <Route path="home" element={<HomeEditor />} />
            <Route path="shop" element={<ShopPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path=":locationId" element={<LocationScene />} />
            <Route path="*" element={<Navigate to="/town" replace />} />
          </Routes>
        </TownProvider>
      </LifeMemoriesProvider>
    </LifeRPGProvider>
  );
}
