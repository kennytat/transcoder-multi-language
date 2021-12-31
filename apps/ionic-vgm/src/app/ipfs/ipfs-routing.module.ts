import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { IpfsPage } from './ipfs.page';

const routes: Routes = [
  {
    path: '',
    component: IpfsPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class IpfsPageRoutingModule { }
