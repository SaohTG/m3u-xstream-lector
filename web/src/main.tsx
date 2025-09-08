import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App'
import Login from './pages/Login'
import Home from './pages/Home'
import Movies from './pages/Movies'
import Series from './pages/Series'
import LiveTV from './pages/LiveTV'
import MyList from './pages/MyList'

const router = createBrowserRouter([
  { path: '/', element: <App/>, children: [
    { index: true, element: <Home/> },
    { path: 'movies', element: <Movies/> },
    { path: 'series', element: <Series/> },
    { path: 'live', element: <LiveTV/> },
    { path: 'my-list', element: <MyList/> },
    { path: 'login', element: <Login/> },
  ]}
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
