import { Routes, Route, BrowserRouter } from "react-router";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Index from '@pages/Index.jsx'

function App() {
  return (
  <>
        <ToastContainer />
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Index />} />
    </Routes>
  </BrowserRouter>
  </>
);
}

export default App;
