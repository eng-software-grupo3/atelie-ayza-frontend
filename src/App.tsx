import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute.tsx';
import { ClienteLayout } from './layouts/ClienteLayout.tsx';
import { GestaoLayout } from './layouts/GestaoLayout.tsx';
import { PedidoNovoLayout } from './layouts/PedidoNovoLayout.tsx';
import { AuthCallback } from './pages/auth/AuthCallback.tsx';
import { Home } from './pages/cliente/Home.tsx';
import { Login } from './pages/cliente/Login.tsx';
import { MeusPedidos } from './pages/cliente/MeusPedidos.tsx';
import { NotFound } from './pages/cliente/NotFound.tsx';
import {
  Estoque,
  EstoqueAderecos,
  EstoqueModelos,
  EstoqueTecidos,
} from './pages/gestao/Estoque.tsx';
import { Agenda } from './pages/gestao/Agenda.tsx';
import { Dashboard } from './pages/gestao/Dashboard.tsx';
import { Pedidos } from './pages/gestao/Pedidos.tsx';
import { Aderecos } from './pages/pedido/Aderecos.tsx';
import { Entrega } from './pages/pedido/Entrega.tsx';
import { Modelo } from './pages/pedido/Modelo.tsx';
import { Resumo } from './pages/pedido/Resumo.tsx';
import { Tamanho } from './pages/pedido/Tamanho.tsx';
import { Tecido } from './pages/pedido/Tecido.tsx';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/" element={<Home />} />

      <Route element={<ProtectedRoute area="cliente" />}>
        <Route element={<ClienteLayout />}>
          <Route path="/meus-pedidos" element={<MeusPedidos />} />

          <Route path="/pedido/novo" element={<PedidoNovoLayout />}>
            <Route index element={<Navigate to="modelo" replace />} />
            <Route path="modelo" element={<Modelo />} />
            <Route path="tecido" element={<Tecido />} />
            <Route path="tamanho" element={<Tamanho />} />
            <Route path="aderecos" element={<Aderecos />} />
            <Route path="resumo" element={<Resumo />} />
            <Route path="entrega" element={<Entrega />} />
          </Route>
        </Route>
      </Route>

      <Route element={<ProtectedRoute area="gestao" />}>
        <Route path="/gestao" element={<GestaoLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="pedidos" element={<Pedidos />} />
          <Route path="estoque" element={<Estoque />}>
            <Route index element={<Navigate to="tecidos" replace />} />
            <Route path="tecidos" element={<EstoqueTecidos />} />
            <Route path="aderecos" element={<EstoqueAderecos />} />
            <Route path="modelos" element={<EstoqueModelos />} />
          </Route>
          <Route path="agenda" element={<Agenda />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
