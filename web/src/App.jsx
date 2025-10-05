import { Routes, Route, BrowserRouter } from "react-router";

import Index from '@pages/Index.jsx'

function App() {
  return (
  <>
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Index />} />
    </Routes>
  </BrowserRouter>
  </>
);
}

export default App;
