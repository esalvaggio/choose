import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Lobby from "./components/Lobby";
import Session from "./components/Session";
import { UserProvider } from "./contexts/UserContext";

function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Lobby />} />
          <Route path="/:sessionId" element={<Session />} />
        </Routes>
      </BrowserRouter>
    </UserProvider>
  );
}

export default App;
