import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './routes/App';
import Auth from './routes/Auth';
import Onboarding from './routes/Onboarding';
import Movies from './routes/Movies';
import Shows from './routes/Shows';
import Live from './routes/Live';
import MyList from './routes/MyList';

const router = createBrowserRouter([
  { path: '/', element: <App/>, children: [
    { index: true, element: <Auth/> },
    { path: 'onboarding', element: <Onboarding/> },
    { path: 'movies', element: <Movies/> },
    { path: 'shows', element: <Shows/> },
    { path: 'live', element: <Live/> },
    { path: 'list', element: <MyList/> },
  ]}
]);

createRoot(document.getElementById('root')!).render(<RouterProvider router={router}/>);
