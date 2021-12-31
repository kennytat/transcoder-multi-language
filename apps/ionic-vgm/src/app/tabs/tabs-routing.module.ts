import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

const routes: Routes = [
  {
    path: 'vgm',
    component: TabsPage,
    children: [
      {
        path: 'converter',
        loadChildren: () =>
          import('../converter/converter.module').then((m) => m.ConverterPageModule),
      },
      {
        path: 'database',
        loadChildren: () =>
          import('../database/database.module').then((m) => m.DatabasePageModule),
      },
      {
        path: 'ipfs',
        loadChildren: () =>
          import('../ipfs/ipfs.module').then((m) => m.IpfsPageModule),
      },
      {
        path: '',
        redirectTo: '/vgm/database',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    redirectTo: '/vgm/database',
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
})
export class TabsPageRoutingModule { }
