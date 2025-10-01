import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  {
    path: 'estaciones',
    loadComponent: () =>
      import('./pages/stations-list/stations-list').then((m) => m.StationsList),
  },
  {
    path: 'estacion/:slug',
    loadComponent: () =>
      import('./pages/station-detail/station-detail').then(
        (m) => m.StationDetail
      ),
  },
  {
    path: 'alojamientos/:station',
    loadComponent: () =>
      import('./pages/lodging-marketplace/lodging-marketplace').then(
        (m) => m.LodgingMarketplace
      ),
  },
  {
    path: 'alquiler/:station',
    loadComponent: () =>
      import('./pages/rental-directory/rental-directory').then(
        (m) => m.RentalDirectory
      ),
  },
  {
    path: 'plan',
    loadComponent: () =>
      import('./pages/planner/planner').then((m) => m.Planner),
  },
  {
    path: 'premium',
    loadComponent: () =>
      import('./pages/premium/premium').then((m) => m.Premium),
  },
  {
    path: 'blog',
    loadComponent: () =>
      import('./pages/blog-list/blog-list').then((m) => m.BlogList),
  },
  {
    path: 'blog/:slug',
    loadComponent: () =>
      import('./pages/blog-article/blog-article').then((m) => m.BlogArticle),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: 'cuenta',
    loadComponent: () =>
      import('./pages/account/account').then((m) => m.Account),
  },
];
