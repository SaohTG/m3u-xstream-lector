import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

function App(){ return <div style={{padding:16}}>NovaStream Web OK</div>; }

const router = createBrowserRouter([{ path: '/', element: <App/> }]);
createRoot(document.getElementById('root')!).render(<RouterProvider router={router}/>);
