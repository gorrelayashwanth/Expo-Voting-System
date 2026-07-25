import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import IdentitySelection from './components/IdentitySelection';
import IdentityForm from './components/IdentityForm';
import ProjectSelection from './components/ProjectSelection';
import Confirmation from './components/Confirmation';
import Dashboard from './components/Dashboard';
import './App.css';

const FormRouteWrapper = () => {
  const { type } = useParams();
  return <IdentityForm variant={type} />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<IdentitySelection />} />
        <Route path="/vote" element={<IdentitySelection />} />
        <Route path="/form/:type" element={<FormRouteWrapper />} />
        <Route path="/projects" element={<ProjectSelection />} />
        <Route path="/success" element={<Confirmation />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
