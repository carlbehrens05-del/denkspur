import { Route, Routes } from 'react-router-dom';
import { DiagnoseView } from '../views/diagnose/DiagnoseView';
import { HomeView } from '../views/home/HomeView';
import { SearchView } from '../views/search/SearchView';
import { de } from './i18n/de';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeView />} />
      <Route path="/suche" element={<SearchView />} />
      <Route path="/diagnose" element={<DiagnoseView />} />
      <Route path="*" element={<p>{de.notFound}</p>} />
    </Routes>
  );
}
